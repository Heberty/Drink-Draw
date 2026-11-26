"use server";

import sharp from "sharp";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CatalogValidationError, isCatalogCollection, isCatalogImageCollection } from "@/lib/catalog";
import { loadCatalog, removeCatalogRecord, saveCatalogRecord, type StoredImage } from "@/lib/catalog-db";
import { imageMaxBytes, imageMaxDimension, imageSize, imageTypes } from "@/lib/catalog-image";
import { readCatalogRecord, validRecordId } from "@/lib/catalog-input";
import { adminCookie, adminLoginConfigured, adminSessionSeconds, getPanelSession, startPanelSession } from "@/lib/admin-auth";

export async function loginAdmin(_previous: string, form: FormData) {
  if (!adminLoginConfigured()) return "Configure as credenciais administrativas em .env.local antes de entrar.";

  const user = form.get("user");
  const password = form.get("password");
  const session = typeof user === "string" && typeof password === "string" &&
    user.length <= 120 && password.length <= 256 ? await startPanelSession(user.trim(), password) : null;
  if (!session) return "Usuário ou senha incorretos.";

  (await cookies()).set(adminCookie, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: adminSessionSeconds,
    path: "/admin",
  });
  redirect("/admin");
}

export async function logoutAdmin() {
  (await cookies()).set(adminCookie, "", { path: "/admin", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  redirect("/admin/login");
}


async function readImage(file: File): Promise<StoredImage> {
  if (!imageTypes.includes(file.type) || file.size <= 0 || file.size > imageMaxBytes) {
    throw new CatalogValidationError("Use uma imagem JPG, PNG ou WebP de até 2 MB.");
  }

  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: imageMaxDimension ** 2 });
    const { format, width, height } = await image.metadata();
    if (!format || !["jpeg", "png", "webp"].includes(format) || !width || !height ||
      width > imageMaxDimension || height > imageMaxDimension) {
      throw new Error("Imagem fora dos limites.");
    }

    const bytes = await image.rotate().resize(imageSize, imageSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).webp({ quality: 90 }).toBuffer();
    return { bytes, type: "image/webp" };
  } catch {
    throw new CatalogValidationError("Use uma imagem válida de até 1600 × 1600 px.");
  }
}

export async function saveAdminCatalogRecord(collection: string, form: FormData) {
  if (!(await getPanelSession())) return { error: "Sua sessão expirou. Entre novamente na administração." };
  if (!isCatalogCollection(collection)) return { error: "Coleção inválida." };

  try {
    const record = readCatalogRecord(collection, form.get("record"));
    const upload = form.get("image");
    const supportsImage = isCatalogImageCollection(collection);
    const image = supportsImage && upload instanceof File ? await readImage(upload)
      : supportsImage && form.get("removeImage") === "true" ? null : undefined;
    const importing = form.get("import") === "true";
    const saved = saveCatalogRecord(collection, record, image, importing);
    return { saved, catalog: importing ? undefined : loadCatalog() };
  } catch (error) {
    if (error instanceof CatalogValidationError) return { error: error.message };
    console.error("Falha ao salvar cadastro", error);
    return { error: "Não foi possível salvar o cadastro no banco de dados." };
  }
}

export async function deleteAdminCatalogRecord(collection: string, id: string) {
  if (!(await getPanelSession())) return { error: "Sua sessão expirou. Entre novamente na administração." };
  if (!isCatalogCollection(collection) || !validRecordId(id)) return { error: "Cadastro inválido." };

  try {
    removeCatalogRecord(collection, id);
    return { saved: true, catalog: loadCatalog() };
  } catch (error) {
    if (error instanceof CatalogValidationError) return { error: error.message };
    console.error("Falha ao excluir cadastro", error);
    return { error: "Não foi possível excluir o cadastro do banco de dados." };
  }
}
