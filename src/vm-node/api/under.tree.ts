import { ConditionWithState } from "../main";

class Under extends ConditionWithState<number, number> {
  test(input: number) {
    return input < this.state;
  }
}

export default Under;
