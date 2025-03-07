// Logical operators
export type SiftSerializerLogicalOperator = '$and' | '$or' | '$not';

// Primitive comparison operators
export type SiftSerializerComparisonOperator =
  | '$eq'
  | '$ne'
  | '$lt'
  | '$gt'
  | '$lte'
  | '$gte'
  | '$in'
  | '$nin'
  // String operator
  | '$ilike'
  // Native array operators
  | '$all'
  | '$exists'
  | '$elemMatch';

// Custom embedded operators for filtering arrays of objects
export type SiftSerializerEmbeddedOperator = '$some' | '$every' | '$none';

export type SiftSerializerConditionNodeValue<T extends SiftSerializerComparisonOperator> =
  T extends '$eq' | '$ne'
    ? number | string | boolean | null
    : T extends '$lt' | '$gt' | '$lte' | '$gte' | '$elemMatch'
      ? number | string
      : T extends '$in' | '$nin' | '$all'
        ? Array<string> | Array<number>
        : T extends '$ilike'
          ? string
          : T extends '$exists'
            ? boolean
            : never;

/**
 * Represents a simple condition on a field.
 */
export interface SiftSerializerConditionNode<
  T extends SiftSerializerComparisonOperator = any,
> {
  id: number; // Unique identifier for UI management (create/edit/delete nodes)
  type: 'condition';
  fieldPath: string[]; // e.g. ["source"] or ["feedback", "store", "id"]
  operator: T;
  value: SiftSerializerConditionNodeValue<T>;
}

/**
 * Represents a logical node that combines multiple AST nodes.
 */
export interface SiftSerializerLogicalNode {
  id: number;
  type: 'logical';
  operator: SiftSerializerLogicalOperator;
  children: SiftSerializerASTNode[];
}

/**
 * Represents an embedded operator node for fields that are arrays of objects.
 * The subtree is the AST representation of the inner filter object.
 */
export interface SiftSerializerEmbeddedOperatorNode {
  id: number;
  type: 'embedded';
  fieldPath: string[]; // e.g. ["tags"]
  operator: SiftSerializerEmbeddedOperator; // "$some", "$every", or "$none"
  subtree: SiftSerializerASTNode[]; // The AST representation of the embedded filter
}

export type SiftSerializerASTNode =
  | SiftSerializerConditionNode
  | SiftSerializerLogicalNode
  | SiftSerializerEmbeddedOperatorNode;
