/**
 * Utility to detect duplicate customer lists across statements
 * Returns a map of customer list signatures to statement IDs that use them
 */

export interface CustomerListSignature {
  customerIds: string[];
  signature: string; // Sorted IDs joined for comparison
}

/**
 * Create a signature from a customer list for comparison
 */
export function createCustomerListSignature(
  customers: Array<{ id: string }> | undefined
): CustomerListSignature | null {
  if (!customers || customers.length === 0) {
    return null;
  }

  const customerIds = customers.map(c => c.id).sort();
  const signature = customerIds.join(',');

  return {
    customerIds,
    signature
  };
}

/**
 * Detect duplicate customer lists across multiple statements
 * Returns a map of signatures to arrays of statement IDs that share the same customer list
 */
export function detectDuplicateCustomerLists(
  statements: Array<{
    id: string;
    supportingData?: {
      customers?: Array<{ id: string }>;
    };
  }>
): Map<string, string[]> {
  const signatureMap = new Map<string, string[]>();

  statements.forEach(statement => {
    const signature = createCustomerListSignature(statement.supportingData?.customers);
    if (signature) {
      const existing = signatureMap.get(signature.signature) || [];
      existing.push(statement.id);
      signatureMap.set(signature.signature, existing);
    }
  });

  // Filter to only return signatures that appear in multiple statements
  const duplicates = new Map<string, string[]>();
  signatureMap.forEach((statementIds, signature) => {
    if (statementIds.length > 1) {
      duplicates.set(signature, statementIds);
    }
  });

  return duplicates;
}

/**
 * Check if two customer lists are identical (same IDs)
 */
export function areCustomerListsIdentical(
  list1: Array<{ id: string }> | undefined,
  list2: Array<{ id: string }> | undefined
): boolean {
  if (!list1 || !list2) {
    return false;
  }

  if (list1.length !== list2.length) {
    return false;
  }

  const sig1 = createCustomerListSignature(list1);
  const sig2 = createCustomerListSignature(list2);

  if (!sig1 || !sig2) {
    return false;
  }

  return sig1.signature === sig2.signature;
}

