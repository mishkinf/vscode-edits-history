import * as vscode from 'vscode';
import Node, { NullableNode } from "./Node";
const deepEqual = require("deep-equal");

let LOOP_AROUND: boolean = vscode.workspace.getConfiguration('editsHistory').get('loopAround') === true;
let MAX_SIZE: number = vscode.workspace.getConfiguration('editsHistory').get('maxHistory') || 5;

vscode.workspace.onDidChangeConfiguration(e => {
  if(e.affectsConfiguration('editsHistory')) {
    MAX_SIZE = vscode.workspace.getConfiguration('editsHistory').get('maxHistory') || 5;
    LOOP_AROUND = vscode.workspace.getConfiguration('editsHistory').get('loopAround') === true;
  }
});

class DoublyLinkedList<T> {
  private _head: NullableNode<T> = null;
  private _tail: NullableNode<T> = null;
  private _current: NullableNode<T> = null;
  private _size: number = 0;

  private insertAfter(node: NullableNode<T>, insertNode: NullableNode<T>) {
    if(!(node && insertNode)) {
      throw Error("Attempting to insert with node(s) that aren't defined!");
    }
    const tmpNode = node.nextNode;
    node.nextNode = insertNode;
    insertNode.previousNode = node;
    insertNode.nextNode = tmpNode;
  }

  public insert(data: T) {
    const node = new Node(data);

    if(this._tail) {
      this.insertAfter(this._tail, node);
      this._current = node;
      this._tail = node;
    } else {
      this._head = this._tail = this._current = node;
    }

    if(++this._size > MAX_SIZE && this._head && this._head.nextNode) {
      this._head.nextNode.previousNode = null;
      this._head = this._head.nextNode;
      this._size--;
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

        this._size--;
      }
      node = node.nextNode;
    } while (node);

    // this.debugList();
  }

  get isEmpty(): boolean {
    return this._size === 0;
  }

  get current(): T | null {
    return this._current && this._current.data;
  }

  debugList() {
    // let node = this._head;
    // let nodesForward = "", nodesBackward = "";

    // if (!node) {
    //   console.log("Head node null!");
    // }
    // do {
    //   if(node) {
    //     if(node === this._current) {
    //       // @ts-ignore: ignoring for now
    //       nodesForward += "*[LINE " + node.data['line'] + "] -> ";
    //     } else {
    //       // @ts-ignore: ignoring for now
    //       nodesForward += "[LINE " + node.data['line'] + "] -> ";
    //     }
    //     node = node.nextNode;
    //   }
    // } while(node);

    // node = this._tail;
    // if(!node) {
    //   console.log("Tail node null!");
    // }
    // do {
    //   if (node) {
    //     if (node === this._current) {
    //       // @ts-ignore: ignoring for now
    //       nodesBackward += "*[LINE " + node.data['line'] + "] -> ";
    //     } else {
    //       // @ts-ignore: ignoring for now
    //       nodesBackward += "[LINE " + node.data['line'] + "] -> ";
    //     }
    //     node = node.previousNode;
    //   }
    // } while (node);

    // console.log("Forwards", nodesForward);
    // console.log("Backwards", nodesBackward);
    // console.log("-------------");
  }

  previous(): T | null {
    if (this._current && this._current.previousNode) {
      this._current = this._current.previousNode;
      return this._current.data;
    } else if (LOOP_AROUND) {
      // perform looping
      this._current = this._tail;
      if (this._current) {
        return this._current.data;
      }
    }
    return null;
  }

  next(): T | null {
    if (this._current && this._current.nextNode) {
      this._current = this._current.nextNode;
      return this._current.data;
    } else if (LOOP_AROUND) {
      // perform looping
      this._current = this._head;
      if(this._current) {
        return this._current.data;
      }
    }
    return null;
  }

  previousMatch(checkMatch: (item: T) => boolean): T | null {
    let node = this._current && this._current.previousNode;
    let counter = 0;

    if (LOOP_AROUND && node === null) {
      node = this._tail; // loop
    } else if (!node) {
      return null;
    }

    do {
      if (!node) {
        return null;
      }

      if(checkMatch(node.data)) {
        this._current = node;
        return this._current.data;
      }

      if (LOOP_AROUND && node === this._head) {
        node = this._tail; // loop
      } else {
        node = node.previousNode;
      }

      if(counter++ > this._size) {
        return null; // prevent infinite loops
      }
    } while (node);

    return null;
  }

  nextMatch(checkMatch: (item: T) => boolean): T | null {
    let node = this._current && this._current.nextNode;
    let counter = 0;

    if (LOOP_AROUND && node === null) {
      node = this._head; // loop
    } else if (!node) {
      return null;
    }

    do {
      if(!node) {
        return null;
      }

      if (checkMatch(node.data)) {
        this._current = node;
        return this._current.data;
      }

      if (LOOP_AROUND && node === this._tail) {
        node = this._head; // loop
      } else {
        node = node.nextNode;
      }

      if (counter++ > this._size) {
        return null; // prevent infinite loops
      }
    } while (node);

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
