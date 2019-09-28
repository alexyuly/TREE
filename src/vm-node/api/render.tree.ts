import { DelegateProcess, DelegateProcessRunner } from "../main";

export default class Render<T> extends DelegateProcessRunner<void, T, void> {
  private _process: DelegateProcess<void, T, void>;

  constructor(process: DelegateProcess<void, T, void>) {
    super();
    this._process = process;
  }

  step() {
    console.log(this._process.input);
  }
}
