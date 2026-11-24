export const imageTypes = ["image/jpeg", "image/png", "image/webp"];
export const imageMaxBytes = 2 * 1024 * 1024;
export const imageMaxDimension = 1600;
export const imageSize = 512;

export async function prepareCatalogImage(file: File): Promise<Blob> {
  if (!imageTypes.includes(file.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
  if (file.size > imageMaxBytes) throw new Error("A imagem deve ter até 2 MB.");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Este arquivo não pôde ser aberto como imagem.");
  });

  try {
    if (bitmap.width > imageMaxDimension || bitmap.height > imageMaxDimension) {
      throw new Error("A imagem deve ter no máximo 1600 × 1600 px.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = imageSize;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu preparar a imagem.");

    const scale = imageSize / Math.max(bitmap.width, bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(bitmap, (imageSize - width) / 2, (imageSize - height) / 2, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("O navegador não conseguiu salvar a imagem.")),
        "image/webp",
        0.86,
      );
    });
  } finally {
    bitmap.close();
  }
}
