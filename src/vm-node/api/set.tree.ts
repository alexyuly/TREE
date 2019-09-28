import { DelegateProcess } from "../main";

class Set<T> extends DelegateProcess<T, unknown, T> {
  run() {
    this.output = this.state;
  }
}

export default Set;
