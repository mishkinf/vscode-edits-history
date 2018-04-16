import Node, { NullableNode } from "./Node";
const deepEqual = require("deep-equal");

class DoublyLinkedList<T> {
  private _head: NullableNode<T> = null;
  private _tail: NullableNode<T> = null;
  private _current: NullableNode<T> = null;

  private insertAfter(node: NullableNode<T>, insertNode: NullableNode<T>) {
    if(!(node && insertNode)) {
      throw Error("Attempting to insert with node(s) that aren't defined!");
    }
    const tmpNode = node.nextNode;
    node.nextNode = insertNode;
    insertNode.previousNode = node;
    insertNode.nextNode = tmpNode;
  }

  private insertBefore(node: NullableNode<T>, insertNode: NullableNode<T>) {
    if (!(node && insertNode)) {
      throw Error("Attempting to insert with node(s) that aren't defined!");
    }
    const tmpNode = node.previousNode;
    node.previousNode = insertNode;
    insertNode.nextNode = node;
    insertNode.previousNode = tmpNode;
  }

  public insert(data: T) {
    this.insertTail(data);
  }

  public insertTail(data: T) {
    const node = new Node(data);

    if(this._tail) {
      this.insertAfter(this._tail, node);
      this._current = node;
      this._tail = node;
    } else {
      this._head = this._tail = this._current = node;
    }
  }

  public insertHead(data: T) {
    const node = new Node(data);

    if(this._head) {
      this.insertBefore(this._head, node);
      this._current = node;
      this._head = node;
    } else {
      this._head = this._tail = this._current = node;
    }
  }

  public insertBeforeCurrent(data: T) {
    const node: NullableNode<T> = new Node(data);

    if (this._current) {
      this.insertBefore(this._current, node);
      this._current = node;
    } else {
      this._head = this._tail = this._current = node;
    }
  }

  public remove(data: T) {
    if (!this._head) {
      return;
    }

    let node: NullableNode<T> = this._head;

    do {
      if (deepEqual(node.data, data)) {
        if(node === this._head) {
          this._head = node.nextNode;
          if(!this._head) {
            this._tail = null;
          }
        } else if(node === this._tail) {
          this._tail = node.previousNode;
          if (!this._tail) {
            this._head = null;
          }
        }

        if (node.previousNode) {
          node.previousNode.nextNode = node.nextNode;
        }
        if (node.nextNode) {
          node.nextNode.previousNode = node.previousNode;
        }

        if(this._current === node) {
          this._current = this._current.previousNode || this._current.nextNode;
        }
      }
      node = node.nextNode;
    } while (node);

    // this.debugList();
  }

  get isEmpty(): boolean {
    return !!!this._head;
  }

  get current(): T | null {
    return this._current && this._current.data;
  }

  debugList() {
    let node = this._head;
    let nodesForward = "", nodesBackward = "";

    if (!node) {
      console.log("Head node null!");
    }
    do {
      if(node) {
        if(node === this._current) {
          // @ts-ignore: ignoring for now
          nodesForward += "*[LINE " + node.data['line'] + "] -> ";
        } else {
          // @ts-ignore: ignoring for now
          nodesForward += "[LINE " + node.data['line'] + "] -> ";
        }
        node = node.nextNode;
      }
    } while(node);

    node = this._tail;
    if(!node) {
      console.log("Tail node null!");
    }
    do {
      if (node) {
        if (node === this._current) {
          // @ts-ignore: ignoring for now
          nodesBackward += "*[LINE " + node.data['line'] + "] -> ";
        } else {
          // @ts-ignore: ignoring for now
          nodesBackward += "[LINE " + node.data['line'] + "] -> ";
        }
        node = node.previousNode;
      }
    } while (node);

    console.log("Forwards", nodesForward);
    console.log("Backwards", nodesBackward);
    console.log("-------------");
  }

  previous(): T | null {
    if (this._current && this._current.previousNode) {
      this._current = this._current.previousNode;
      return this._current.data;
    }
    return null;
  }

  next(): T | null {
    if (this._current && this._current.nextNode) {
      this._current = this._current.nextNode;
      return this._current.data;
    }
    return null;
  }

  toList(): T[] {
    if(!this._head) {
      return [];
    }

    let node: NullableNode<T> = this._head;
    const nodeArr: T[] = [];

    do {
      nodeArr.push(node.data);
      node = node.nextNode;
    } while(node);

    return nodeArr;
  }
}

export default DoublyLinkedList;
