import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Users as UsersIcon, Shield, BookOpen } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUsers()
      .then(res => setUsers(res.data?.value || []))
      .finally(() => setLoading(false));
  }, []);

  const roleIcons = { Admin: Shield, Instructor: BookOpen, Student: UsersIcon };
  const roleColors = {
    Admin: 'bg-red-100 text-red-700',
    Instructor: 'bg-blue-100 text-blue-700',
    Student: 'bg-green-100 text-green-700'
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Users</h2>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.ID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleColors[u.role] || 'bg-gray-100'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
