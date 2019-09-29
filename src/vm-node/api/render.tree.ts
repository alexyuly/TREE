import { Stream } from "../main";

class Render<T> extends Stream<null, T> {
  run() {
    console.log(this.input);
  }
}

export default Render;
