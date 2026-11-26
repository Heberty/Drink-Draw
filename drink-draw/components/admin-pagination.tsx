"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

const pageSizes = [10, 50, 100] as const;
type PageSize = (typeof pageSizes)[number];

type PaginationProps = {
  page: number;
  pageCount: number;
  pageSize: PageSize;
  total: number;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
};

export function useAdminPagination<T>(records: T[]) {
  const [requestedPage, setPage] = useState(1);
  const [pageSize, updatePageSize] = useState<PageSize>(10);
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const page = Math.min(requestedPage, pageCount);

  function setPageSize(size: PageSize) {
    updatePageSize(size);
    setPage(1);
  }

  return {
    pageItems: records.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageCount, pageSize, total: records.length, setPage, setPageSize },
  };
}

export function AdminPagination({ page, pageCount, pageSize, total, setPage, setPageSize }: PaginationProps) {
  const selectId = useId();
  return (
    <nav className="admin-pagination" aria-label="Paginação">
      <div className="admin-page-size">
        <label htmlFor={selectId}>Itens por página</label>
        <NativeSelect id={selectId} value={pageSize} onChange={(event) => {
          const size = pageSizes.find((option) => String(option) === event.target.value);
          if (size) setPageSize(size);
        }}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </NativeSelect>
      </div>
      <div className="admin-pagination-controls">
        <Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
        <span aria-live="polite">{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}` : "0 itens"}</span>
        <Button type="button" variant="outline" disabled={page === pageCount} onClick={() => setPage(page + 1)}>Próxima</Button>
      </div>
    </nav>
  );
}
