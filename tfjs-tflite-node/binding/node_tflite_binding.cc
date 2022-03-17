/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

#include <cstdint>
#include <napi.h>
#include <sstream>
#include "tensorflow/lite/c/c_api.h"
#include "tensorflow/lite/c/c_api_types.h"
#include "tensorflow/lite/delegates/external/external_delegate.h"

class TensorInfo : public Napi::ObjectWrap<TensorInfo> {
 public:
  static Napi::FunctionReference constructor;
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);
    Napi::Function func = DefineClass(env, "TensorInfo", {
        InstanceAccessor<&TensorInfo::GetDataType>("dataType"),
        InstanceAccessor<&TensorInfo::GetShape>("shape"),
        InstanceAccessor<&TensorInfo::GetId>("id"),
        InstanceAccessor<&TensorInfo::GetName>("name"),
        InstanceMethod<&TensorInfo::GetData>("data"),
      });

    // Create a persistent reference to the class constructor. This lets us
    // instantiate TensorInfos in the interpreter.
    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();
    //exports.Set("TensorInfo", func);

    return exports;
  }

  TensorInfo(const Napi::CallbackInfo& info)
      : Napi::ObjectWrap<TensorInfo>(info) { }

  ~TensorInfo() {
    dataArray.Unref();
  }

 private:
  friend class Interpreter;
  const TfLiteTensor *tensor = nullptr;
  int id = -1;
  Napi::Reference<Napi::TypedArray> dataArray;

  void setTensor(Napi::Env env, const TfLiteTensor *t, int i) {
    tensor = t;
    id = i;
    void* data = TfLiteTensorData(tensor);
    if (!data) {
      Napi::Error::New(env, "Failed to get tensor data").ThrowAsJavaScriptException();
    }

    TfLiteType tensorType = TfLiteTensorType(tensor);
    size_t length = getLength();
    size_t byteSize = TfLiteTensorByteSize(tensor);
    auto buffer = Napi::ArrayBuffer::New(
        env, (uint8_t*)data, byteSize); // TODO: Finalizer?

    Napi::TypedArray typedArray;
    switch (tensorType) {
    case kTfLiteNoType:
      typedArray = Napi::Uint8Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteFloat32:
      typedArray = Napi::Float32Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteInt32:
      typedArray = Napi::Int32Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteUInt8:
      typedArray = Napi::Uint8Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteInt64:
      typedArray = Napi::BigInt64Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteString:
      Napi::Error::New(env, "'kTfLiteString' is not yet supported")
          .ThrowAsJavaScriptException();
      break;
    case kTfLiteBool:
      typedArray = Napi::Uint8Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteInt16:
      typedArray = Napi::Int16Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteComplex64:
      Napi::Error::New(env, "'kTfLiteComplex64' is not yet supported")
          .ThrowAsJavaScriptException();
      break;
    case kTfLiteInt8:
      typedArray = Napi::Int8Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteFloat16:
      Napi::Error::New(env, "'kTfLiteFloat16' is not yet supported")
          .ThrowAsJavaScriptException();
      break;
      break;
    case kTfLiteFloat64:
      typedArray = Napi::Float64Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteComplex128:
      Napi::Error::New(env, "'kTfLiteComplex128' is not yet supported")
          .ThrowAsJavaScriptException();
      break;
    case kTfLiteUInt64:
      typedArray = Napi::BigUint64Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteResource:
      Napi::Error::New(env, "'kTfLiteResource' is not yet supported")
          .ThrowAsJavaScriptException();
      break;
    case kTfLiteVariant:
      Napi::Error::New(env, "'kTfLiteVariant' is not yet supported")
          .ThrowAsJavaScriptException();
      break;
    case kTfLiteUInt32:
      typedArray = Napi::Uint32Array::New(env, getLength(), buffer, 0);
      break;
    }
    dataArray = Napi::Reference<Napi::TypedArray>::New(typedArray, 1);
  }

  Napi::Value GetId(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, id);
  }

  Napi::Value GetName(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (tensor != nullptr) {
      std::string name(TfLiteTensorName(tensor));
      return Napi::String::New(env, name);
    }
    return Napi::String::New(env, "unknown tensor");
  }

  Napi::Value GetDataType(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    TfLiteType tensorType = TfLiteTensorType(tensor);
    switch (tensorType) {
      case kTfLiteNoType:
        return Napi::String::New(env, "kTfLiteNoType");
      case kTfLiteFloat32:
        return Napi::String::New(env, "float32");
      case kTfLiteInt32:
        return Napi::String::New(env, "int32");
      case kTfLiteUInt8:
        return Napi::String::New(env, "uint8");
      case kTfLiteInt64:
        return Napi::String::New(env, "kTfLiteInt64");
      case kTfLiteString:
        return Napi::String::New(env, "kTfLiteString");
      case kTfLiteBool:
        return Napi::String::New(env, "bool");
      case kTfLiteInt16:
        return Napi::String::New(env, "int16");
      case kTfLiteComplex64:
        return Napi::String::New(env, "kTfLiteComplex64");
      case kTfLiteInt8:
        return Napi::String::New(env, "int8");
      case kTfLiteFloat16:
        return Napi::String::New(env, "kTfLiteFloat16");
      case kTfLiteFloat64:
        return Napi::String::New(env, "float64");
      case kTfLiteComplex128:
        return Napi::String::New(env, "kTfLiteComplex128");
      case kTfLiteUInt64:
        return Napi::String::New(env, "kTfLiteUInt64");
      case kTfLiteResource:
        return Napi::String::New(env, "kTfLiteResource");
      case kTfLiteVariant:
        return Napi::String::New(env, "kTfLiteVariant");
      case kTfLiteUInt32:
        return Napi::String::New(env, "uint32");
    }
  }

  Napi::Value GetShape(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int numDims = TfLiteTensorNumDims(tensor);

    std::stringstream shape;
    for (int i = 0; i < numDims; i++) {
      if (i != 0) {
        shape << ",";
      }
      shape << TfLiteTensorDim(tensor, i);
    }

    return Napi::String::New(env, shape.str());
  }

  size_t getLength() {
    TfLiteType tensorType = TfLiteTensorType(tensor);
    size_t byteSize = TfLiteTensorByteSize(tensor);
    switch (tensorType) {
      case kTfLiteNoType:
        return byteSize;
      case kTfLiteFloat32:
        return byteSize / 4;
      case kTfLiteInt32:
        return byteSize / 4;
      case kTfLiteUInt8:
        return byteSize;
      case kTfLiteInt64:
        return byteSize / 8;
      case kTfLiteString:
        return byteSize;
      case kTfLiteBool:
        return byteSize;
      case kTfLiteInt16:
        return byteSize / 2;
      case kTfLiteComplex64:
        return byteSize / 8;
      case kTfLiteInt8:
        return byteSize;
      case kTfLiteFloat16:
        return byteSize / 2;
      case kTfLiteFloat64:
        return byteSize / 8;
      case kTfLiteComplex128:
        return byteSize / 16;
      case kTfLiteUInt64:
        return byteSize / 8;
      case kTfLiteResource:
        return byteSize;
      case kTfLiteVariant:
        return byteSize;
      case kTfLiteUInt32:
        return byteSize / 4;
    }
  }

  Napi::Value GetData(const Napi::CallbackInfo &info) {
    return dataArray.Value();
  }
};

Napi::FunctionReference TensorInfo::constructor;

class Interpreter : public Napi::ObjectWrap<Interpreter> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);
    Napi::Function func = DefineClass(env, "Interpreter", {
        InstanceMethod<&Interpreter::GetInputs>("getInputs"),
        InstanceMethod<&Interpreter::GetOutputs>("getOutputs"),
        InstanceMethod<&Interpreter::Infer>("infer"),
      });

    Napi::FunctionReference* constructor = new Napi::FunctionReference();

    // Create a persistent reference to the class constructor. This will allow
    // a function called on a class prototype and a function
    // called on instance of a class to be distinguished from each other.
    *constructor = Napi::Persistent(func);
    exports.Set("Interpreter", func);

    return exports;
  }

  Interpreter(const Napi::CallbackInfo& info)
      : Napi::ObjectWrap<Interpreter>(info) {
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    // TODO: Throw error on incorrect argument types.
    // Model is stored as a uint8 buffer.
    Napi::ArrayBuffer buffer = info[0].As<Napi::ArrayBuffer>();
    // Options are an object.
    Napi::Object options = info[1].As<Napi::Object>();

    // Set number of threads from options.
    int threads = 0;
    auto maybeThreads = options.Get("threads");
    if (maybeThreads.IsNumber()) {
      threads = maybeThreads.ToNumber().Int32Value();
    }

    // Create options for the interpreter.
    auto interpreterOptions = TfLiteInterpreterOptionsCreate();
    if (threads > 0) {
      TfLiteInterpreterOptionsSetNumThreads(interpreterOptions, threads);
    }

    // TODO(mattsoulanille): Support multiple delegates at a time.
    if (options.Has("delegate")) {
      auto delegateConfig = options.Get("delegate").As<Napi::Object>();
      delegate_path = delegateConfig.Get("path").As<Napi::String>().Utf8Value();
      auto delegate_options_array = delegateConfig.Get("options").As<Napi::Array>();

      std::vector<std::vector<std::string>> options;
      TfLiteExternalDelegateOptions delegateOptions = TfLiteExternalDelegateOptionsDefault(delegate_path.c_str());
      for (uint i = 0; i < delegate_options_array.Length(); i++) {
        auto pair = delegate_options_array.Get(i).As<Napi::Array>();
        std::string key = pair.Get((uint) 0).As<Napi::String>().Utf8Value();
        std::string val = pair.Get((uint) 1).As<Napi::String>().Utf8Value();

        // Options must remain allocated until the interpreter is created, but
        // options must be inserted as char*. Store options in a vector to keep
        // them allocated.
        std::vector<std::string> pairVec;
        pairVec.push_back(key);
        pairVec.push_back(val);
        options.push_back(pairVec);

        TfLiteStatus status = delegateOptions.insert(&delegateOptions,
                                                     key.c_str(),
                                                     val.c_str());
        throwIfError(env, "Failed to set delegate options", status);
      }

      TfLiteDelegate* delegate = TfLiteExternalDelegateCreate(&delegateOptions);

      TfLiteInterpreterOptionsAddDelegate(interpreterOptions, delegate);
    }

    // Create a model from the model buffer.
    modelData = std::vector<uint8_t>(
        (uint8_t*) buffer.Data(), (uint8_t*) buffer.Data() + buffer.ByteLength());

    auto model = TfLiteModelCreate(modelData.data(), modelData.size());
    if (!model) {
      Napi::Error::New(env, "Failed to create tflite model").ThrowAsJavaScriptException();
      TfLiteInterpreterOptionsDelete(interpreterOptions);
      return;
    }

    interpreter = TfLiteInterpreterCreate(model, interpreterOptions);
    if (!interpreter) {
      Napi::Error::New(env, "Failed to create tflite interpreter").ThrowAsJavaScriptException();
      TfLiteModelDelete(model);
      TfLiteInterpreterOptionsDelete(interpreterOptions);
      return;
    }

    // Allocate tensors
    throwIfError(env, "Failed to allocate tensors",
                TfLiteInterpreterAllocateTensors(interpreter));

    TfLiteModelDelete(model);
    TfLiteInterpreterOptionsDelete(interpreterOptions);

    // Construct input tensor objects
    int inputTensorCount = TfLiteInterpreterGetInputTensorCount(interpreter);
    Napi::Array inputTensorArray = Napi::Array::New(info.Env(), inputTensorCount);
    for (int id = 0; id < inputTensorCount; id++) {
      const TfLiteTensor* tensor = TfLiteInterpreterGetInputTensor(interpreter, id);
      auto wrappedTensorInfo = TensorInfo::constructor.New({});
      auto tensorInfo = TensorInfo::Unwrap(wrappedTensorInfo);
      tensorInfo->setTensor(env, tensor, id);
      // tensorInfo->id = id;
      // tensorInfo->tensor = tensor;
      inputTensorArray[id] = wrappedTensorInfo;
    }
    inputTensorRef = Napi::Reference<Napi::Array>::New(inputTensorArray, 1);

    // Construct output tensor objects
    int outputTensorCount = TfLiteInterpreterGetOutputTensorCount(interpreter);
    Napi::Array outputTensorArray = Napi::Array::New(info.Env(), outputTensorCount);
    for (int id = 0; id < outputTensorCount; id++) {
      const TfLiteTensor* tensor = TfLiteInterpreterGetOutputTensor(interpreter, id);
      auto wrappedTensorInfo = TensorInfo::constructor.New({});
      auto tensorInfo = TensorInfo::Unwrap(wrappedTensorInfo);
      tensorInfo->setTensor(env, tensor, id);
      //tensorInfo->id = id;
      //tensorInfo->tensor = tensor;

      outputTensorArray[id] = wrappedTensorInfo;
    }
    outputTensorRef = Napi::Reference<Napi::Array>::New(outputTensorArray, 1);
  }

  Napi::Value GetInputs(const Napi::CallbackInfo& info) {
    return inputTensorRef.Value();
  }

  Napi::Value GetOutputs(const Napi::CallbackInfo& info) {
    return outputTensorRef.Value();
  }

  ~Interpreter() {
    inputTensorRef.Unref();
    outputTensorRef.Unref();
    TfLiteInterpreterDelete(interpreter);
  }

 private:
  TfLiteInterpreter *interpreter = nullptr;
  Napi::Reference<Napi::Array> inputTensorRef;
  Napi::Reference<Napi::Array> outputTensorRef;
  std::vector<uint8_t> modelData;
  std::string delegate_path;

  Napi::Value Infer(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    throwIfError(env, "Failed to invoke interpreter", TfLiteInterpreterInvoke(interpreter));

    return Napi::Boolean::New(env, true);
  }

  void throwIfError(Napi::Env &env, std::string message, TfLiteStatus status) {
    if (status != kTfLiteOk) {
      Napi::Error::New(env, message + ": " + decodeStatus(status)).ThrowAsJavaScriptException();
    }
  }

  std::string decodeStatus(TfLiteStatus status) {
    switch (status) {
      case kTfLiteOk:
        return "Ok";
      case kTfLiteError:
        return "Unexpected Interpreter Error";
      case kTfLiteDelegateError:
        return "Error from delegate";
      case kTfLiteApplicationError:
        return "Incompatability between runtime and delegate, \
            possibly due to applying a delegate to a model graph \
            that is already immutable";
      case kTfLiteDelegateDataNotFound:
        return "Serialized delegate data not found";
      case kTfLiteDelegateDataWriteError:
        return "Could not write serialized data to delegate";
      case kTfLiteDelegateDataReadError:
        return "Could not read serialized data from delegate";
      case kTfLiteUnresolvedOps:
        return "Model contains ops that cannot be resolved at runtime";
    }
    return "Unknown status code";
  }

};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  Interpreter::Init(env, exports);
  TensorInfo::Init(env, exports);

  return exports;
}

NODE_API_MODULE(hello, Init)
