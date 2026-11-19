import type { IconButtonProps } from "@mui/material/IconButton";
import TablePagination from "@mui/material/TablePagination";
import type { HTMLAttributes } from "react";

import { robotPageSizes } from "@/modules/robots/robot";

export default function RobotTablePagination({
  total,
  page,
  pageSize,
  onPageSizeChange,
  onPageChange,
  disabled,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
  disabled: boolean;
}) {
  return (
    <TablePagination
      data-testid="fleet-pagination"
      component="div"
      count={total}
      page={page}
      rowsPerPage={pageSize}
      rowsPerPageOptions={robotPageSizes}
      onRowsPerPageChange={(event) =>
        onPageSizeChange(Number(event.target.value))
      }
      disabled={disabled}
      slotProps={{
        actions: {
          previousButton: {
            "data-testid": "fleet-previous-page",
          } as IconButtonProps,
          nextButton: {
            "data-testid": "fleet-next-page",
          } as IconButtonProps,
        },
        select: {
          SelectDisplayProps: {
            "data-testid": "fleet-page-size",
          } as HTMLAttributes<HTMLDivElement>,
        },
        displayedRows: () => ({ "data-testid": "fleet-page-summary" }),
        spacer: { sx: { display: "none" } },
        toolbar: {
          disableGutters: true,
          sx: { justifyContent: "flex-start", pl: 2 },
        },
      }}
      onPageChange={(_, nextPage) => onPageChange(nextPage)}
    />
  );
}
