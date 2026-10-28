/** Admin 2026-10. Deliberately no email/address/payment instrument fields. */
export const LOYALTY_PAYMENT_QUERY = `query MoseLoyaltyPayment($id: ID!) {
  order(id: $id) {
    id updatedAt currencyCode presentmentCurrencyCode test displayFinancialStatus
    totalPriceSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
    totalReceivedSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
    totalRefundedSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
    totalOutstandingSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
    transactionsCount { count precision }
    transactions(first: 100) {
      id kind status test gateway manualPaymentGateway
      amountSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
    }
    discountApplications(first: 100) {
      nodes { __typename index ... on DiscountCodeApplication { code } }
      pageInfo { hasNextPage }
    }
    lineItems(first: 100) {
      nodes { id discountAllocations {
        allocatedAmountSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
        discountApplication { index }
      } }
      pageInfo { hasNextPage }
    }
    shippingLines(first: 100) {
      nodes { id discountAllocations {
        allocatedAmountSet { shopMoney { amount currencyCode } presentmentMoney { amount currencyCode } }
        discountApplication { index }
      } }
      pageInfo { hasNextPage }
    }
  }
}`
