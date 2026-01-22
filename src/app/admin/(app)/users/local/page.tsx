
'use client';

import { CustomerManagementPage } from "../CustomerManagementPage";

export default function AdminLocalCustomersPage() {
  return (
    <CustomerManagementPage
      title="Local Customers"
      description="Manage customers who are not registered through the online portal."
      customerType="LOCAL"
      displayColumns={['simple']}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canBlock={true}
    />
  );
}
