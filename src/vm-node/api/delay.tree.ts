import { DelegateProcessRunner } from "../main";

export default class Delay<T> extends DelegateProcessRunner<T, T, number> {
  step() {
    const input = this.process.input;
    setTimeout(() => {
      this.process.output = input;
    }, this.process.state);
  }
}
