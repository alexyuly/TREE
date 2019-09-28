import { DelegateProcessRunner } from "../main";

export default class Render<T> extends DelegateProcessRunner<void, T, void> {
  step() {
    console.log(this.process.input);
  }
}
