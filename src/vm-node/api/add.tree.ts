import { DelegateProcessRunner } from "../main";

class Add extends DelegateProcessRunner<number, number, number> {
  step() {
    this.process.output = this.process.input + this.process.state;
  }
}

export default Add;
