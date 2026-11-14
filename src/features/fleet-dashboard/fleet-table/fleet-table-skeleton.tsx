"use client";

import Skeleton from "@mui/material/Skeleton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { type RefObject, useEffect, useState } from "react";

const skeletonRowHeight = 73;

export default function FleetTableSkeleton({
  containerRef,
  headerRef,
  columnCount,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLTableSectionElement | null>;
  columnCount: number;
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
          Math.ceil(
            (container.clientHeight - header.clientHeight) / skeletonRowHeight,
          ),
        ),
      );
    });
    observer.observe(container);
    observer.observe(header);
    return () => observer.disconnect();
  }, [containerRef, headerRef]);

  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={row}>
      {Array.from({ length: columnCount }, (_, column) => (
        <TableCell key={column}>
          <Skeleton height={40} animation={false} aria-hidden="true" />
        </TableCell>
      ))}
    </TableRow>
  ));
}
