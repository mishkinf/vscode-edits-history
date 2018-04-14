export type NullableNode<T> = Node<T> | null;

class Node<T> {
  private _previousNode: NullableNode<T> = null;
  private _nextNode: NullableNode<T> = null;
  private _data: T;

  constructor(data: T) {
    this._data = data;
    this._previousNode = null;
    this._nextNode = null;
  }

  get previousNode(): NullableNode<T> {
    return this._previousNode;
  }

  set previousNode(node: NullableNode<T>) {
    this._previousNode = node;
  }

  get nextNode(): NullableNode<T> {
    return this._nextNode;
  }

  set nextNode(node: NullableNode<T>) {
    this._nextNode = node;
  }

  get data(): T {
    return this._data;
  }

  set data(data: T) {
    if (data) {
      this._data = data;
    }
  }
}

export default Node;
