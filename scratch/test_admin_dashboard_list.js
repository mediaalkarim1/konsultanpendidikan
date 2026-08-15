import { getConsultationsListAction, getConsultationDetailAction } from "../src/actions/admin-actions.ts";

async function testAdminDashboardList() {
  console.log("==================================================");
  console.log("TESTING ADMIN DASHBOARD LIST & DETAIL FETCHING");
  console.log("==================================================");

  try {
    const listRes = await getConsultationsListAction({ data: { page: 1, limit: 10 } });
    console.log("List Response Status:", listRes.success);
    console.log("Total Count:", listRes.count);
    console.log("Stats:", JSON.stringify(listRes.stats));
    console.log("Data Rows Count:", listRes.data?.length || 0);

    if (listRes.data && listRes.data.length > 0) {
      const firstId = listRes.data[0].id;
      console.log("\nTesting detail fetch for first item ID:", firstId);
      const detailRes = await getConsultationDetailAction({ data: { consultationId: firstId } });
      console.log("Detail Response Status:", detailRes.success);
      if (detailRes.success && detailRes.consultation) {
        console.log("Parent Name:", detailRes.consultation.parent_name);
        console.log("Child Name:", detailRes.consultation.child_name);
        console.log("Level:", detailRes.consultation.level);
        console.log("Answers Count:", detailRes.answers?.length || 0);
      }
    }
  } catch (err) {
    console.error("Test Exception:", err);
  }

  console.log("==================================================");
}

testAdminDashboardList();
