"use client";

import Skeleton from "@mui/material/Skeleton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { type RefObject, useEffect, useState } from "react";

export default function FleetTableSkeleton({
  containerRef,
  headerRef,
  columnCount,
  rowHeight,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLTableSectionElement | null>;
  columnCount: number;
  rowHeight: number;
}) {
  const [rows, setRows] = useState(20);
  useEffect(() => {
    const container = containerRef.current;
    const header = headerRef.current;
    if (!container || !header || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setRows(
        Math.max(
          1,
          Math.ceil((container.clientHeight - header.clientHeight) / rowHeight),
        ),
      );
    });
    observer.observe(container);
    observer.observe(header);
    return () => observer.disconnect();
  }, [containerRef, headerRef, rowHeight]);

  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={row} sx={{ height: rowHeight }}>
      {Array.from({ length: columnCount }, (_, column) => (
        <TableCell key={column}>
          <Skeleton height={40} animation={false} aria-hidden="true" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
