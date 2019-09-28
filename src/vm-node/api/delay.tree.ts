import { DelegateProcessRunner } from "../main";

export default class Delay<T> extends DelegateProcessRunner<T, T, number> {
  private _callback = () => {
    this.process.output = this.process.input;
  };

  step() {
    setTimeout(this._callback, this.process.state);
  }
}
