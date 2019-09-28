import { DelegateProcessRunner } from "../main";

class Set<T> extends DelegateProcessRunner<T, unknown, T> {
  step() {
    this.process.output = this.process.state;
  }
}

export default Set;
