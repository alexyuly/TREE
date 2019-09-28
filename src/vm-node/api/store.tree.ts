import { DelegateProcessRunner } from "../main";

class Store<T> extends DelegateProcessRunner<T, T, T> {
  step() {
    const state = (this.process.state = this.process.input);
    setTimeout(() => {
      this.process.output = state;
    }, 0);
  }
}

export default Store;
