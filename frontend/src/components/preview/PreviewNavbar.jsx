import React from 'react';

export function PreviewNavbar({
  count = 0,
  editedCount = 0,
  mode = 'grid',
  onModeChange,
  search = '',
  onSearchChange,
  filter = 'all',
  onFilterChange,
  onBack,
  onOpenExport,
  onOpenDeliveryCenter,
}) {
  return (
    <header className="border-b border-border bg-surface px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 shadow-xs">
      {/* Left: Step label, Back, Count */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-1 text-xs text-muted hover:text-primary px-2.5 py-1 rounded-lg border border-border hover:bg-bg transition-colors"
          title="Back to Participants"
        >
          <span>←</span>
          <span>Participants</span>
        </button>

        <div className="h-3.5 w-px bg-border" />

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-primary">
            Review {count} {count === 1 ? 'Certificate' : 'Certificates'}
          </span>
          {editedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {editedCount} Edited
            </span>
          )}
        </div>
      </div>

      {/* Center: Search, Filter Tabs & View Mode Switcher */}
      <div className="flex items-center space-x-3">
        {/* Search */}
        <div className="relative w-48 sm:w-56">
          <input
            type="text"
            placeholder="Search certificates..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 text-xs border border-border rounded-lg bg-bg focus:bg-surface focus:outline-none focus:border-indigo-500 text-primary"
          />
          <svg className="w-3.5 h-3.5 text-muted absolute left-2 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter */}
        <div className="flex items-center bg-bg p-0.5 rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-2.5 py-0.5 rounded-md transition-colors ${
              filter === 'all' ? 'bg-surface text-primary font-semibold shadow-xs' : 'text-muted hover:text-primary'
            }`}
          >
            All
          </button>
          {editedCount > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange('edited')}
              className={`px-2.5 py-0.5 rounded-md transition-colors ${
                filter === 'edited' ? 'bg-surface text-amber-700 font-semibold shadow-xs' : 'text-muted hover:text-primary'
              }`}
            >
              Edited ({editedCount})
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-bg p-0.5 rounded-lg border border-border text-xs">
          <button
            type="button"
            onClick={() => onModeChange('grid')}
            className={`px-2.5 py-0.5 rounded-md transition-colors ${
              mode === 'grid' ? 'bg-surface text-primary font-semibold shadow-xs' : 'text-muted hover:text-primary'
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => onModeChange('single')}
            className={`px-2.5 py-0.5 rounded-md transition-colors ${
              mode === 'single' ? 'bg-surface text-primary font-semibold shadow-xs' : 'text-muted hover:text-primary'
            }`}
          >
            Single
          </button>
        </div>
      </div>

      {/* Right: Export & Proceed to Deliver */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onOpenExport}
          className="px-3 py-1.5 text-xs font-medium text-primary bg-surface border border-border hover:bg-bg rounded-lg transition-colors flex items-center space-x-1"
        >
          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export</span>
        </button>

        <button
          type="button"
          onClick={onOpenDeliveryCenter}
          className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
        >
          <span>Proceed to Deliver</span>
          <span>→</span>
        </button>
      </div>
    </header>
  );
}
