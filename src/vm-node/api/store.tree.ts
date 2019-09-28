import { DelegateProcess } from "../main";

class Store<T> extends DelegateProcess<T, T, T> {
  run() {
    const state = (this.state = this.input);
    setTimeout(() => {
      this.output = state;
    }, 0);
  }
}

export default Store;
