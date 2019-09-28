class Listener {
  constructor(stream) {
    this._stream = stream;
  }

  send() {
    // abstract
  }
}

class StateListener extends Listener {
  send(value) {
    super.input = value;
    this._stream.state = value;
  }
}

class InputListener extends Listener {
  send(value) {
    super.input = value;
    this._stream.input = value;
  }
}

class OutputListener extends Listener {
  send(value) {
    super.input = value;
    this._stream.output = value;
  }
}

class Stream {
  constructor(listeners = []) {
    this._listeners = listeners;
  }

  static create(spec, listeners) {
    if (spec.type === "component") {
      return new ComponentStream(spec, listeners);
    }
    return new DelegateStream(spec, listeners);
  }

  get input() {
    return this._input;
  }

  set input(value) {
    this._input = value;
    this._process();
  }

  _process() {
    // abstract
  }

  set output(value) {
    for (const listener of this._listeners) {
      listener.send(value);
    }
  }
}

class DelegateStream extends Stream {
  constructor(spec, listeners) {
    super(listeners);
    this._delegate = require(`./api/${spec.type}.tree`);
    if (spec.type === "value-producer") {
      const value = spec.props.find(x => x.key === "value").val;
      this.state = value;
      this._process();
    } else {
      const stateProp = spec.props.find(x => x.key === "state");
      if (stateProp) {
        const state = stateProp.val;
        Stream.create(state, [new StateListener(this)]);
        // TODO The state stream should listen through its input.
      }
    }
  }

  _process() {
    this._delegate(this);
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }
}

class ComponentStream extends Stream {
  constructor(spec, listeners) {
    super(listeners);
    const consumers = spec.props.find(x => x.key === "consumers").val;
    const consumerStreams = consumers.map(x =>
      Stream.create(x, [new OutputListener(this)])
    );
    const consumerListeners = consumerStreams.map(x => new InputListener(x));
    const producers = spec.props.find(x => x.key === "producers").val;
    const producerStreams = producers.map(x =>
      Stream.create(x, consumerListeners)
    );
    this._producerListeners = producerStreams.map(x => new InputListener(x));
  }

  _process() {
    for (const producerListener of this._producerListeners) {
      producerListener.send(this._input);
    }
  }
}

module.exports = spec => {
  new ComponentStream(spec);
};
