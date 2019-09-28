import { DelegateProcess, DelegateProcessRunner } from "../main";

export default class Delay<T> extends DelegateProcessRunner<T, T, number> {
  private _process: DelegateProcess<T, T, number>;

  constructor(process: DelegateProcess<T, T, number>) {
    super();
    this._process = process;
  }

  private _callback = () => {
    this._process.output = this._process.input;
  };

  run() {
    setTimeout(this._callback, this._process.state);
  }
}
