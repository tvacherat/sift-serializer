import {
  SiftSerializerASTNode,
  SiftSerializerComparisonOperator,
  SiftSerializerConditionNodeValue,
  SiftSerializerEmbeddedOperator,
  SiftSerializerEmbeddedOperatorNode,
  SiftSerializerLogicalNode,
  SiftSerializerLogicalOperator,
} from '../types/sift.types';

/**
 * This class serializes a raw Sift condition object into an AST representation that can be easily manipulated,
 * and deserializes the AST back into a raw Sift condition object.
 * The AST is always returned as an array of nodes.
 */
export class SiftEntityMatcherSerializer {
  /**
   * The AST representation of the Sift condition.
   * It is always an array of AST nodes.
   */
  private _tree: SiftSerializerASTNode[];

  /** Internal counter for generating unique node IDs. */
  private _idCounter = 0;

  /**
   * Constructs the serializer with the provided Sift condition object.
   * @param query The raw condition object.
   */
  constructor(query?: object) {
    if (query) {
      this._tree = this._serializeObject(query, []);
    } else {
      this._tree = [];
    }
  }

  /**
   * Gets the AST tree.
   * @returns The read only AST tree.
   */
  public get tree(): readonly SiftSerializerASTNode[] {
    // Make the tree read-only to prevent direct modifications.
    return this._tree;
  }

  /**
   * Serializes the raw Sift condition object into an AST representation.
   * @param query The raw Sift condition object.
   * @returns The read only serialized AST tree.
   */
  public serialize(query: object): readonly SiftSerializerASTNode[] {
    this._tree = this._serializeObject(query, []);
    // Make the tree read-only to prevent direct modifications.
    return this.tree;
  }

  /**
   * Deserializes the AST back into a raw Sift condition object.
   * @returns The raw Sift condition object, or null if the result is empty.
   */
  public deserialize(): object | null {
    const deserialized = this._deserializeNodes(this._tree);
    if (!this._isNotEmpty(deserialized)) {
      return null;
    }
    return deserialized;
  }

  /**
   * Finds a node by its unique ID.
   * @param id The unique numeric ID of the node to find.
   * @returns The node if found; otherwise, null.
   */
  public findNodeById(id: number): SiftSerializerASTNode | null {
    return this._findNodeById(this._tree, id);
  }

  /**
   * Adds a condition node.
   * If no parentId is provided or if the tree is empty, the node is added at the root.
   * @param fieldPath The field path for the condition.
   * @param operator The comparison operator.
   * @param value The value to compare against, with type determined by the operator.
   * @param parentId (Optional) The parent node id.
   * @returns The created condition node id.
   * @throws An error if a parentId is provided but no matching container node is found.
   */
  public addConditionNode<T extends SiftSerializerComparisonOperator>(
    fieldPath: string[],
    operator: T,
    value: SiftSerializerConditionNodeValue<T>,
    parentId?: number,
  ): number {
    const newNode: SiftSerializerASTNode = {
      id: this._generateId(),
      type: 'condition',
      fieldPath,
      operator,
      value,
    };
    return this._addNode(newNode, parentId).id;
  }

  /**
   * Modifies a condition node identified by its unique id.
   * Only condition nodes can be modified.
   * @param id The unique numeric id of the condition node.
   * @param operator The new comparison operator.
   * @param value The new value, whose type is determined by the operator.
   * @returns True if the node was successfully updated.
   * @throws An error if the node with the given id is not found or is not a condition node.
   */
  public updateConditionNode<T extends SiftSerializerComparisonOperator>(
    id: number,
    operator: T,
    value: SiftSerializerConditionNodeValue<T>,
  ): true {
    const node = this._findNodeById(this._tree, id);
    if (!node) {
      throw new Error(`Node with id ${id} not found.`);
    }
    if (node.type !== 'condition') {
      throw new Error(
        `Node with id ${id} is not a condition node and cannot be modified.`,
      );
    }
    node.operator = operator;
    node.value = value;
    return true;
  }

  /**
   * Adds a logical node ($and, $or, or $not).
   * If no parentId is provided or if the tree is empty, the node is added at the root.
   * @param operator The logical operator ($and, $or, or $not).
   * @param parentId (Optional) The parent node id.
   * @returns The created logical node id.
   * @throws An error if a parentId is provided but no matching container node is found.
   */
  public addLogicalNode(
    operator: SiftSerializerLogicalOperator,
    parentId?: number,
  ): number {
    const newNode: SiftSerializerLogicalNode = {
      id: this._generateId(),
      type: 'logical',
      operator,
      children: [],
    };
    return this._addNode(newNode, parentId).id;
  }

  /**
   * Adds an embedded node ($some, $every, or $none).
   * If no parentId is provided or if the tree is empty, the node is added at the root.
   * @param fieldPath The field path for the embedded node.
   * @param operator The embedded operator ($some, $every, or $none).
   * @param parentId (Optional) The parent node id.
   * @returns The created embedded node id.
   * @throws An error if a parentId is provided but no matching container node is found.
   */
  public addEmbeddedNode(
    fieldPath: string[],
    operator: SiftSerializerEmbeddedOperator,
    parentId?: number,
  ): number {
    const newNode: SiftSerializerEmbeddedOperatorNode = {
      id: this._generateId(),
      type: 'embedded',
      fieldPath,
      operator,
      subtree: [],
    };
    return this._addNode(newNode, parentId).id;
  }

  /**
   * Handles the common logic for adding a node.
   * If parentId is provided, the node is added as a child of the matching container node.
   * Otherwise, the node is added at the root.
   * @param node The node to add.
   * @param parentId (Optional) The parent node id.
   * @returns The added node.
   * @throws An error if parentId is provided but no matching container node is found.
   */
  private _addNode(
    node: SiftSerializerASTNode,
    parentId?: number,
  ): SiftSerializerASTNode {
    if (parentId !== undefined) {
      const parent = this._findNodeById(this._tree, parentId);
      if (!parent) {
        throw new Error(`Parent node with id ${parentId} not found.`);
      }
      if (!['logical', 'embedded'].includes(parent.type)) {
        throw new Error(`Cannot add a node to a non-container node (id: ${parentId}).`);
      }
      if (parent.type === 'logical') {
        (parent as SiftSerializerLogicalNode).children.push(node);
      } else {
        (parent as SiftSerializerEmbeddedOperatorNode).subtree.push(node);
      }
    } else {
      this._tree.push(node);
    }
    return node;
  }

  /**
   * Removes a node from the AST based on its unique ID.
   * @param id The unique numeric ID of the node to remove.
   * @returns True if a node was successfully removed; otherwise, false.
   */
  public remove(id: number): boolean {
    return this._removeNodeFromList(this._tree, id);
  }

  /**
   * Clears the AST tree.
   */
  public clear(): void {
    this._tree = [];
  }

  /**
   * Generates a unique numeric ID for AST nodes.
   * @returns A unique numeric ID.
   */
  private _generateId(): number {
    return this._idCounter++;
  }

  /**
   * Checks if the given key is a logical operator.
   * @param key The key to check.
   * @returns True if the key is a logical operator.
   */
  private _isLogicalOperator(key: string): boolean {
    return ['$and', '$or', '$not'].includes(key);
  }

  /**
   * Checks if the given key is an embedded operator.
   * @param key The key to check.
   * @returns True if the key is an embedded operator.
   */
  private _isEmbeddedOperator(key: string): boolean {
    return ['$some', '$every', '$none'].includes(key);
  }

  /**
   * Checks if the given key is a comparison operator.
   * @param key The key to check.
   * @returns True if the key is a comparison operator.
   */
  private _isComparisonOperator(key: string): boolean {
    return [
      '$eq',
      '$in',
      '$nin',
      '$lt',
      '$gt',
      '$lte',
      '$gte',
      '$ne',
      '$ilike',
      '$all',
      '$exists',
      '$elemMatch',
    ].includes(key);
  }

  /**
   * Recursively serializes a Sift condition object into an array of AST nodes.
   * @param obj The current Sift condition object or sub-object.
   * @param currentPath The current field path (used for nested fields).
   * @returns An array of SiftSerializerASTNodes representing the given object.
   */
  private _serializeObject(obj: any, currentPath: string[]): SiftSerializerASTNode[] {
    // If obj is an array, process each element and flatten the results.
    if (Array.isArray(obj)) {
      const nodesArr: SiftSerializerASTNode[] = [];
      for (const item of obj) {
        const childNodes = this._serializeObject(item, currentPath);
        nodesArr.push(...childNodes);
      }
      return nodesArr;
    }
    const nodes: SiftSerializerASTNode[] = [];
    for (const key in obj) {
      if (this._isLogicalOperator(key)) {
        const value = obj[key];
        if (key === '$not') {
          // $not takes a single condition object.
          const childNodes = this._serializeObject(value, currentPath);
          nodes.push({
            id: this._generateId(),
            type: 'logical',
            operator: '$not',
            children: childNodes,
          });
        } else if (key === '$and' || key === '$or') {
          // $and and $or expect an array of conditions.
          const children: SiftSerializerASTNode[] = [];
          for (const item of value) {
            const childNodes = this._serializeObject(item, currentPath);
            children.push(...childNodes);
          }
          nodes.push({
            id: this._generateId(),
            type: 'logical',
            operator: key,
            children: children,
          });
        }
      } else {
        const fieldValue = obj[key];
        let fieldNodes: SiftSerializerASTNode[] = [];
        let operatorFound = false;
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          for (const op in fieldValue) {
            if (this._isEmbeddedOperator(op)) {
              operatorFound = true;
              const embeddedValue = fieldValue[op];
              const subtree = this._serializeObject(embeddedValue, []); // new context for embedded filter
              fieldNodes.push({
                id: this._generateId(),
                type: 'embedded',
                fieldPath: currentPath.concat(key),
                operator: op as SiftSerializerEmbeddedOperator,
                subtree,
              });
            } else if (this._isComparisonOperator(op)) {
              operatorFound = true;
              fieldNodes.push({
                id: this._generateId(),
                type: 'condition',
                fieldPath: currentPath.concat(key),
                operator: op as SiftSerializerComparisonOperator,
                value: fieldValue[op],
              });
            } else if (this._isLogicalOperator(op)) {
              operatorFound = true;
              const childNodes = this._serializeObject(
                fieldValue[op],
                currentPath.concat(key),
              );
              fieldNodes.push({
                id: this._generateId(),
                type: 'logical',
                operator: op as SiftSerializerLogicalOperator,
                children: childNodes,
              });
            }
          }
        }
        if (!operatorFound && fieldValue && typeof fieldValue === 'object') {
          // No operator keys found, treat fieldValue as a nested object.
          fieldNodes = this._serializeObject(fieldValue, currentPath.concat(key));
        }
        nodes.push(...fieldNodes);
      }
    }
    return nodes;
  }

  /**
   * Recursively deserializes an array or a single AST node into a raw Sift condition object.
   * Empty deserialized nodes are skipped.
   * @param nodes The AST node or an array of AST nodes.
   * @returns A raw Sift condition object.
   */
  private _deserializeNodes(nodes: SiftSerializerASTNode | SiftSerializerASTNode[]): any {
    const deserializedObjects: any[] = [];
    if (Array.isArray(nodes)) {
      for (const node of nodes) {
        const d = this._deserializeNode(node);
        if (this._isNotEmpty(d)) deserializedObjects.push(d);
      }
    } else {
      const d = this._deserializeNode(nodes);
      if (this._isNotEmpty(d)) deserializedObjects.push(d);
    }
    return this._mergeObjects(deserializedObjects);
  }

  /**
   * Recursively deserializes a single AST node into a raw Sift condition object.
   * Empty child nodes are filtered out.
   * @param node The AST node to deserialize.
   * @returns A raw Sift condition object.
   */
  private _deserializeNode(node: SiftSerializerASTNode): any {
    switch (node.type) {
      case 'condition': {
        const condition = { [node.operator]: node.value };
        return this._buildNestedObject(node.fieldPath, condition);
      }
      case 'logical': {
        if (node.operator === '$not') {
          const childObj = this._deserializeNodes(node.children);
          if (!this._isNotEmpty(childObj)) return {};
          return { $not: childObj };
        } else {
          const childrenArr = node.children
            .map(child => this._deserializeNode(child))
            .filter(child => this._isNotEmpty(child));
          if (!this._isNotEmpty(childrenArr)) {
            return {};
          }
          return { [node.operator]: childrenArr };
        }
      }
      case 'embedded': {
        const inner = this._deserializeNodes(node.subtree);
        if (!this._isNotEmpty(inner)) return {};
        return this._buildNestedObject(node.fieldPath, { [node.operator]: inner });
      }
      default:
        return {};
    }
  }

  /**
   * Deeply merges an array of deserialized Sift condition objects into a single object.
   * @param objects The array of deserialized objects.
   * @returns A single merged raw Sift condition object.
   */
  private _mergeObjects(objects: any[]): any {
    let result: any = {};
    for (const obj of objects) {
      result = this._deepMerge(result, obj);
    }
    return result;
  }

  /**
   * Deeply merges two objects.
   * @param target The target object.
   * @param source The source object.
   * @returns The merged object.
   */
  private _deepMerge(target: any, source: any): any {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          target[key] &&
          typeof target[key] === 'object' &&
          typeof source[key] === 'object'
        ) {
          target[key] = this._deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  /**
   * Builds a nested object from a field path and a condition.
   * For example, given path ["feedback", "store", "id"] and condition { "$eq": "someId" },
   * returns { "feedback": { "store": { "id": { "$eq": "someId" } } } }.
   * @param path The array representing the field path.
   * @param condition The condition to set at the deepest level.
   * @returns A nested object representing the field condition.
   */
  private _buildNestedObject(path: string[], condition: any): any {
    if (path.length === 0) return condition;
    const result: any = {};
    let current = result;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = condition;
    return result;
  }

  /**
   * Recursively finds a node with the specified ID within the given list of AST nodes.
   * @param nodes The list of AST nodes.
   * @param id The unique numeric ID of the node to find.
   * @returns The AST node if found; otherwise, null.
   */
  private _findNodeById(
    nodes: SiftSerializerASTNode[],
    id: number,
  ): SiftSerializerASTNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.type === 'logical') {
        const found = this._findNodeById(
          (node as SiftSerializerLogicalNode).children,
          id,
        );
        if (found) return found;
      } else if (node.type === 'embedded') {
        const found = this._findNodeById(
          (node as SiftSerializerEmbeddedOperatorNode).subtree,
          id,
        );
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Recursively removes a node with the specified ID from the given list of AST nodes.
   * @param nodes The list of AST nodes.
   * @param id The unique numeric ID of the node to remove.
   * @returns True if a node was removed; otherwise, false.
   */
  private _removeNodeFromList(nodes: SiftSerializerASTNode[], id: number): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (nodes[i].type === 'logical') {
        const node = nodes[i] as SiftSerializerLogicalNode;
        if (this._removeNodeFromList(node.children, id)) {
          return true;
        }
      } else if (nodes[i].type === 'embedded') {
        const node = nodes[i] as SiftSerializerEmbeddedOperatorNode;
        if (this._removeNodeFromList(node.subtree, id)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks if the given object is not empty.
   * @param obj The object to check.
   * @returns True if the object is not empty.
   */
  private _isNotEmpty(obj: any): boolean {
    if (obj === null || obj === undefined) return false;
    if (Array.isArray(obj)) return obj.length > 0;
    if (typeof obj === 'object') return Object.keys(obj).length > 0;
    return true;
  }
}
