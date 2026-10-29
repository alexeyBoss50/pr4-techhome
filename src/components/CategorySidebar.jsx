export default function CategorySidebar({ categories, selected, onToggle }) {
  return <aside className="sidebar"><h3>Категории</h3>{categories.map(category => <label className="check-row" key={category.name}><input type="checkbox" checked={selected.includes(category.name)} onChange={() => onToggle(category.name)}/><span>{category.name} ({category.service_count})</span></label>)}</aside>;
}
