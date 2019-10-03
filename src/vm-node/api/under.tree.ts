import { ImmediateStore } from "../main";

class Under extends ImmediateStore<boolean, number, number> {
  run() {
    return this.input < this.state;
  }
}

export default Under;
