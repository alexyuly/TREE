import { DelegateProcessRunner } from "../main";

class Get<T> extends DelegateProcessRunner<T, T, void> {
  step() {
    this.process.output = this.process.input;
  }
}

export default Get;
