'use client';

import { CustomerManagementPage } from "../CustomerManagementPage";

export default function AdminOnlineCustomersPage() {
  return (
    <CustomerManagementPage
      title="Online Customers"
      description="Manage customers who have registered through the website."
      customerType="ONLINE"
      displayColumns={['simple']}
      canCreate={false}
      canEdit={true}
      canDelete={false}
      canBlock={true}
    />
  );
}
