import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatDate } from '../../utils/format';
import './AdminCustomersPage.css';

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);
  const { data, loading, error, reload } = useFetch(() => adminService.listCustomers({ q, status, page, limit: 20 }), [q, status, page]);

  return (
    <>
      <AdminPageHeader eyebrow="Sales" title="Customers" subtitle="Registered customer accounts with their order totals. Guest checkouts appear under Orders." />
      <div className="admin-toolbar">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Name, email or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Account status">
          <option value="">All accounts</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            loading={loading}
            rows={data?.customers}
            onRowClick={(c) => navigate(`/admin/customers/${c._id}`)}
            empty={{ icon: Users, title: 'No customers found', text: 'Customers appear here once they create an account.' }}
            columns={[
              {
                key: 'name',
                header: 'Customer',
                render: (c) => (
                  <div className="cell-main">
                    <span className="admin-avatar customer-avatar">{c.name.charAt(0).toUpperCase()}</span>
                    <div>
                      <span className="cell-title">{c.name}</span>
                      <span className="cell-sub">{c.email}</span>
                    </div>
                  </div>
                ),
              },
              { key: 'phone', header: 'Phone', render: (c) => c.phone || '—' },
              { key: 'totalOrders', header: 'Orders', align: 'right', render: (c) => <span className="cell-number">{c.totalOrders}</span> },
              { key: 'totalSpent', header: 'Total spent', align: 'right', render: (c) => <strong className="cell-number">{formatCurrency(c.totalSpent)}</strong> },
              { key: 'createdAt', header: 'Registered', hideOnMobile: true, render: (c) => formatDate(c.createdAt) },
              { key: 'isActive', header: 'Status', render: (c) => <StatusBadge tone={c.isActive ? 'success' : 'danger'} size="sm">{c.isActive ? 'Active' : 'Deactivated'}</StatusBadge> },
            ]}
          />
          {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />}
        </>
      )}
    </>
  );
}
