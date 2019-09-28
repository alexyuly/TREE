import { DelegateProcess } from "../main";

class Get<T> extends DelegateProcess<T, T, void> {
  run() {
    this.output = this.input;
  }
}

export default Get;
