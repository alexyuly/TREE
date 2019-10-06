import { StaticCondition } from "../main";

class Under extends StaticCondition<number, number> {
  test(input: number) {
    return input < this.state;
  }
}

export default Under;
