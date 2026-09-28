import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './Breadcrumbs.css';

export default function Breadcrumbs({ items = [], light = false }) {
  const all = [{ label: 'Home', to: '/' }, ...items];
  return (
    <nav aria-label="Breadcrumb" className={`breadcrumbs ${light ? 'breadcrumbs--light' : ''}`}>
      <ol>
        {all.map((item, index) => {
          const last = index === all.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {last || !item.to ? <span aria-current={last ? 'page' : undefined}>{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
              {!last && <ChevronRight aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
