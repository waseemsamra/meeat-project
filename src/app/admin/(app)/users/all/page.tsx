
'use client';

import { CustomerManagementPage } from "../CustomerManagementPage";

export default function AdminAllUsersPage() {
  return (
    <CustomerManagementPage
      title="All Users"
      description="Manage all users, including online customers, local customers, and staff."
      displayColumns={['simple']}
      canCreate={false}
      canEdit={true}
      canDelete={true}
      canBlock={true}
    />
  );
}
