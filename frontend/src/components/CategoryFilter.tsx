import type { Category } from "../api/types.js";
import { ALL_CATEGORIES } from "../api/types.js";

const CATEGORY_LABEL: Record<Category, string> = {
  debugging: "Debugging",
  feature: "Feature work",
  refactoring: "Refactoring",
  docs: "Documentation",
  marketing: "Marketing",
  other: "Other",
};

export interface CategoryFilterProps {
  selected: Category | null;
  onChange: (category: Category | null) => void;
}

/** Filters the marketplace overview by category (briefing point 5). */
export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="category-filter" role="group" aria-label="Filter by category">
      <button
        type="button"
        aria-pressed={selected === null}
        className={`category-filter__chip${selected === null ? " category-filter__chip--active" : ""}`}
        onClick={() => onChange(null)}
      >
        All categories
      </button>
      {ALL_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={selected === category}
          className={`category-filter__chip${selected === category ? " category-filter__chip--active" : ""}`}
          onClick={() => onChange(category)}
        >
          {CATEGORY_LABEL[category]}
        </button>
      ))}
    </div>
  );
}
