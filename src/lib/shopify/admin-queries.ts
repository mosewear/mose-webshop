// Shopify Admin API 2026-10. Read-only; no fulfillment/payment mutations.
export const ORDER_QUERY = `query MoseOrder($id: ID!, $after: String) {
  order(id: $id) {
    id name updatedAt cancelledAt displayFinancialStatus displayFulfillmentStatus currencyCode
    currentTotalPriceSet { shopMoney { amount currencyCode } }
    totalRefundedSet { shopMoney { amount currencyCode } }
    customAttributes { key value }
    lineItems(first: 100, after: $after) {
      nodes { id name sku quantity currentQuantity variant { id }
        originalUnitPriceSet { shopMoney { amount currencyCode } }
        discountedTotalSet { shopMoney { amount currencyCode } }
      }
      pageInfo { hasNextPage endCursor }
    }
    fulfillments(first: 100) {
      id status createdAt updatedAt location { id name }
      trackingInfo { company number url }
      fulfillmentLineItems(first: 100) { nodes { quantity lineItem { id } } pageInfo { hasNextPage endCursor } }
    }
    refunds {
      id createdAt totalRefundedSet { shopMoney { amount currencyCode } }
      refundLineItems(first: 100) { nodes { quantity lineItem { id } restockType } pageInfo { hasNextPage endCursor } }
    }
    fulfillmentOrders(first: 100) {
      nodes { id status requestStatus assignedLocation { name location { id } }
        lineItems(first: 100) { nodes { id remainingQuantity totalQuantity lineItem { id } } pageInfo { hasNextPage endCursor } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}`

export const ORDERS_UPDATED_QUERY = `query MoseOrdersUpdated($query: String!, $after: String) {
  orders(first: 50, after: $after, query: $query, sortKey: UPDATED_AT) {
    nodes { id updatedAt }
    pageInfo { hasNextPage endCursor }
  }
}`
