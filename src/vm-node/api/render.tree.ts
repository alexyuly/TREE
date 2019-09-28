import { DelegateProcessRunner } from "../main";

class Render<T> extends DelegateProcessRunner<void, T, void> {
  step() {
    console.log(this.process.input);
  }
}

export default Render;
