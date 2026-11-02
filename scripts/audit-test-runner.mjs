async function postOrder(payload) {
  const res = await fetch("http://localhost:3000/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  const baseOrder = {
    slug: "test-brand",
    name: "Arif Hossain",
    phone: "01755112233",
    address: "House 15, Road 4, Dhanmondi",
    district: "Dhaka",
    zone: "dhaka-city",
    color: "Deep Indigo",
    size: "L (42)",
    quantity: 1,
    paymentMethod: "bkash",
    transactionId: "TXAUDIT" + Date.now().toString().slice(-6),
    paidFrom: "01811223344",
    idempotencyKey: "audit-key-" + Date.now(),
    lang: "en",
  };

  console.log("=== SCENARIO 1: New Mobile Order ===");
  const r1 = await postOrder(baseOrder);
  console.log("Status:", r1.status);
  console.log("Response:", JSON.stringify(r1.data, null, 2));

  console.log("\n=== SCENARIO 2: Same IdempotencyKey Retry ===");
  const r2 = await postOrder(baseOrder);
  console.log("Status:", r2.status);
  console.log("Response:", JSON.stringify(r2.data, null, 2));

  console.log("\n=== SCENARIO 3: Reused TrxID on New Order ===");
  const r3 = await postOrder({
    ...baseOrder,
    idempotencyKey: "audit-key-diff-" + Date.now(),
    // Keep same transactionId as baseOrder
  });
  console.log("Status:", r3.status);
  console.log("Response:", JSON.stringify(r3.data, null, 2));

  console.log("\n=== SCENARIO 5a: Missing TrxID ===");
  const r5a = await postOrder({
    ...baseOrder,
    transactionId: "",
    idempotencyKey: "audit-key-missing-trx-" + Date.now(),
  });
  console.log("Status:", r5a.status);
  console.log("Response:", JSON.stringify(r5a.data, null, 2));

  console.log("\n=== SCENARIO 5b: Short TrxID (< 6 chars) ===");
  const r5b = await postOrder({
    ...baseOrder,
    transactionId: "ABC12",
    idempotencyKey: "audit-key-short-trx-" + Date.now(),
  });
  console.log("Status:", r5b.status);
  console.log("Response:", JSON.stringify(r5b.data, null, 2));

  console.log("\n=== SCENARIO 5c: Symbol-filled TrxID ===");
  const r5c = await postOrder({
    ...baseOrder,
    transactionId: "TRX-1234#AB",
    idempotencyKey: "audit-key-sym-trx-" + Date.now(),
  });
  console.log("Status:", r5c.status);
  console.log("Response:", JSON.stringify(r5c.data, null, 2));

  console.log("\n=== SCENARIO 6: Invalid Paid-From Number ===");
  const r6 = await postOrder({
    ...baseOrder,
    paidFrom: "01234567890", // Invalid prefix 012
    idempotencyKey: "audit-key-bad-paidfrom-" + Date.now(),
  });
  console.log("Status:", r6.status);
  console.log("Response:", JSON.stringify(r6.data, null, 2));

  console.log("\n=== SCENARIO 7: bKash Order on Client with bKash Disabled (demo-brand) ===");
  const r7 = await postOrder({
    ...baseOrder,
    slug: "demo-brand",
    idempotencyKey: "audit-key-disabled-bkash-" + Date.now(),
  });
  console.log("Status:", r7.status);
  console.log("Response:", JSON.stringify(r7.data, null, 2));
}

run().catch(console.error);
