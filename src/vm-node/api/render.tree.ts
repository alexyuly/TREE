import { DelegateProcess } from "../main";

class Render<T> extends DelegateProcess<void, T, void> {
  run() {
    console.log(this.input);
  }
}

export default Render;
