'use client'

import { Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RowActionsMenu, type RowAction } from '@/components/crud/row-actions-menu'
import { Button } from '@/components/ds/button'
import { Card } from '@/components/ds/card'
import { DataTable, type Column } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { FilterBar, type FilterDef } from '@/components/ds/filter-bar'
import { PageContainer, PageToolbar } from '@/components/ds/page-header'

export function EntityList<T>({
  title,
  singular,
  icon,
  emptyDescription,
  search,
  filters,
  filterValues,
  onFilterChange,
  onClear,
  summary,
  columns,
  rows,
  rowKey,
  rowActions,
  onCreate,
  onRowClick,
  layout = 'table',
  renderCard,
}: {
  title: string
  singular: string
  icon: LucideIcon
  emptyDescription: string
  search: { value: string; onChange: (value: string) => void; placeholder: string; label: string }
  filters: readonly FilterDef[]
  filterValues: Record<string, string>
  onFilterChange: (key: string, value: string) => void
  onClear: () => void
  summary?: ReactNode
  columns: readonly Column<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  rowActions: (row: T) => readonly RowAction[]
  onCreate: () => void
  onRowClick?: (row: T) => void
  layout?: 'table' | 'cards'
  /** Card renderer for layout="cards"; receives the row and its actions menu. */
  renderCard?: (row: T, actions: ReactNode) => ReactNode
}) {
  const allColumns: Column<T>[] = [
    ...columns,
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-12',
      cell: (row) => <RowActionsMenu label={`Acciones de ${singular}`} actions={rowActions(row)} />,
    },
  ]
  return (
    <PageContainer>
      <PageToolbar
        title={title}
        actions={
          <Button onClick={onCreate}>
            <Plus size={16} aria-hidden="true" />
            Nuevo {singular}
          </Button>
        }
      >
        <FilterBar
          search={search}
          filters={filters}
          values={filterValues}
          onChange={onFilterChange}
          onClear={onClear}
          trailing={summary ? <span className="text-sm text-muted-foreground">{summary}</span> : null}
        />
      </PageToolbar>
      {layout === 'cards' && renderCard ? (
        rows.length === 0 ? (
          <Card>
            <EmptyState icon={icon} title={`Ningún ${singular} coincide`} description={emptyDescription} />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <div key={rowKey(row)}>
                {renderCard(
                  row,
                  <RowActionsMenu label={`Acciones de ${singular}`} actions={rowActions(row)} />,
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <Card>
          <DataTable
            columns={allColumns}
            rows={rows}
            rowKey={rowKey}
            onRowClick={onRowClick}
            empty={
              <EmptyState icon={icon} title={`Ningún ${singular} coincide`} description={emptyDescription} />
            }
          />
        </Card>
      )}
    </PageContainer>
  )
}
