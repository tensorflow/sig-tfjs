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
#include <cstdio>
#include <sstream>
#include <string>
#include <type_traits>
#include "tensorflow/lite/c/c_api.h"
#include "tensorflow/lite/c/c_api_types.h"
#include "tensorflow/lite/delegates/external/external_delegate.h"

#define MAX_ERROR_LEN 1000

namespace tfjs_tflite_node {

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
  void *localData = nullptr;
  int id = -1;
  Napi::Reference<Napi::TypedArray> dataArray;

  void throwIfError(Napi::Env &env, std::string message, TfLiteStatus status) {
    if (status != kTfLiteOk) {
      throw Napi::Error::New(env, message + ": " + decodeStatus(status));
    }
  }

  /**
   * Copy the tensor's local data to the TFLite tensor.
   *
   * This is necessary because we can't base the TypedArray off of the TFLite
   * tensor's void* data pointer. If we do, we see the following error in node
   * versions 13 through 16:
   * # Fatal error in , line 0
   * # Check failed: result.second.
   */
  void copyToTflite(Napi::Env &env) {
    throwIfError(env, "Failed to copy tensor data to TFLite",
                 TfLiteTensorCopyFromBuffer((TfLiteTensor*) tensor, localData,
                                            TfLiteTensorByteSize(tensor)));
  }

  /**
   * Copy the TFLite tensor to local data.
   */
  void copyFromTflite(Napi::Env &env) {
    throwIfError(env, "Failed to copy tensor data from TFLite",
                 TfLiteTensorCopyToBuffer(tensor, localData,
                                          TfLiteTensorByteSize(tensor)));
  }

  void setTensor(Napi::Env env, const TfLiteTensor *t, int i) {
    tensor = t;
    id = i;

    TfLiteType tensorType = TfLiteTensorType(tensor);
    size_t byteSize = TfLiteTensorByteSize(tensor);
    auto buffer = Napi::ArrayBuffer::New(env, byteSize);
    localData = buffer.Data();

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
      throw Napi::Error::New(env, "'kTfLiteString' is not yet supported");
      break;
    case kTfLiteBool:
      typedArray = Napi::Uint8Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteInt16:
      typedArray = Napi::Int16Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteComplex64:
      throw Napi::Error::New(env, "'kTfLiteComplex64' is not yet supported");
      break;
    case kTfLiteInt8:
      typedArray = Napi::Int8Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteFloat16:
      throw Napi::Error::New(env, "'kTfLiteFloat16' is not yet supported");
      break;
    case kTfLiteFloat64:
      typedArray = Napi::Float64Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteComplex128:
      throw Napi::Error::New(env, "'kTfLiteComplex128' is not yet supported");
      break;
    case kTfLiteUInt64:
      typedArray = Napi::BigUint64Array::New(env, getLength(), buffer, 0);
      break;
    case kTfLiteResource:
      throw Napi::Error::New(env, "'kTfLiteResource' is not yet supported");
      break;
    case kTfLiteVariant:
      throw Napi::Error::New(env, "'kTfLiteVariant' is not yet supported");
      break;
    case kTfLiteUInt32:
      typedArray = Napi::Uint32Array::New(env, getLength(), buffer, 0);
      break;
    }
    // Start reference count at 1 since the Tensor object (this object) has a
    // reference to the data array. This prevents JavaScript from GC-ing it.
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
      default:
        return Napi::String::New(env, "Unknown data type");
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
      default:
        return byteSize;
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

    // Options are an object.
    Napi::Object options = info[1].As<Napi::Object>();
    interpreterOptions = TfLiteInterpreterOptionsCreate();
    apply_options(env, options);

    // Create a custom error reporter so JS errors can have meaningful messages.
    TfLiteInterpreterOptionsSetErrorReporter(interpreterOptions, report_error, &error_stream);

    // TODO: Throw error on incorrect argument types.
    // Model is stored as a uint8 buffer.
    Napi::ArrayBuffer buffer = info[0].As<Napi::ArrayBuffer>();
    // Create a model from the model buffer.
    modelData = std::vector<uint8_t>(
        (uint8_t*) buffer.Data(), (uint8_t*) buffer.Data() + buffer.ByteLength());

    model = TfLiteModelCreate(modelData.data(), modelData.size());
    if (!model) {
      TfLiteInterpreterOptionsDelete(interpreterOptions);
      throw Napi::Error::New(env, "Failed to create tflite model. "
                             + get_and_clear_error_message());
    }

    interpreter = TfLiteInterpreterCreate(model, interpreterOptions);
    if (!interpreter) {
      TfLiteModelDelete(model);
      TfLiteInterpreterOptionsDelete(interpreterOptions);
      throw Napi::Error::New(env, "Failed to create tflite interpreter. "
                             + get_and_clear_error_message());
    }

    // Allocate tensors
    throw_if_tflite_error(env, "Failed to allocate tensors",
                TfLiteInterpreterAllocateTensors(interpreter));

    // Get input tensors
    auto inputs = make_tensors(env, interpreter, /* input? */ true);
    // Start with a refcount of 1. Otherwise, it will get garbage collected,
    // since we haven't passed it to JavaScript yet.
    inputTensorRef = Napi::Reference<Napi::Array>::New(inputs.first, 1);
    inputTensors = inputs.second;

    // Get output tensors
    auto outputs = make_tensors(env, interpreter, /* input? */ false);
    outputTensorRef = Napi::Reference<Napi::Array>::New(outputs.first, 1);
    outputTensors = outputs.second;
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
    TfLiteModelDelete(model);
    TfLiteInterpreterOptionsDelete(interpreterOptions);
    TfLiteInterpreterDelete(interpreter);
  }

 private:
  TfLiteInterpreter *interpreter = nullptr;
  TfLiteModel *model = nullptr;
  TfLiteInterpreterOptions *interpreterOptions = nullptr;
  std::vector<TensorInfo*> inputTensors;
  Napi::Reference<Napi::Array> inputTensorRef;
  std::vector<TensorInfo*> outputTensors;
  Napi::Reference<Napi::Array> outputTensorRef;
  std::vector<uint8_t> modelData;
  std::string delegate_path;
  std::vector<std::pair<std::string, std::string>> options_strings;
  std::stringstream error_stream;

  void apply_options(Napi::Env &env, Napi::Object &options) {
    // Set number of threads from options.
    int threads = 0;
    auto maybeThreads = options.Get("threads");
    if (maybeThreads.IsNumber()) {
      threads = maybeThreads.ToNumber().Int32Value();
    }

    if (threads > 0) {
      TfLiteInterpreterOptionsSetNumThreads(interpreterOptions, threads);
    }

    // TODO(mattsoulanille): Support multiple delegates at a time.
    if (options.Has("delegate")) {
      auto delegate_config = options.Get("delegate").As<Napi::Object>();
      delegate_path = delegate_config.Get("path").As<Napi::String>().Utf8Value();
      auto delegate_options_array = delegate_config.Get("options").As<Napi::Array>();

      TfLiteExternalDelegateOptions delegate_options =
          TfLiteExternalDelegateOptionsDefault(delegate_path.c_str());

      // Options must remain allocated until the interpreter is created, but
      // options must be inserted as char*. Store options in a vector to keep
      // them allocated.
      auto delegate_options_vec = parse_delegate_options(
          env, delegate_options_array);
      fill_delegate_options(env, delegate_options, delegate_options_vec);

      TfLiteDelegate* delegate = TfLiteExternalDelegateCreate(&delegate_options);

      TfLiteInterpreterOptionsAddDelegate(interpreterOptions, delegate);
    }
  }

  void fill_delegate_options(
      Napi::Env &env,
      TfLiteExternalDelegateOptions &delegate_options,
      std::vector<std::pair<std::string, std::string>> &options) {
    for (auto option : options) {
      auto status = delegate_options.insert(&delegate_options,
                                            option.first.c_str(),
                                            option.second.c_str());
      throw_if_tflite_error(env, "Failed to set delegate options", status);
    }
  }

  std::vector<std::pair<std::string, std::string>> parse_delegate_options(
      Napi::Env &env, Napi::Array &options) {

    std::vector<std::pair<std::string, std::string>> options_vec;
    for (uint32_t i = 0; i < options.Length(); i++) {
      Napi::Value option = options.Get(i);
      if (!option.IsArray()) {
        throw Napi::Error::New(env, "Expected option to be an array but got "
                               + option.ToString().Utf8Value());
      }
      Napi::Array as_array = option.As<Napi::Array>();
      options_vec.push_back(parse_delegate_option(env, as_array));
    }
    return options_vec;
  }

  std::pair<std::string, std::string> parse_delegate_option(
      Napi::Env &env, Napi::Array &option) {

    std::pair<std::string, std::string> pair;
    auto first = option.Get((uint32_t) 0);
    if (!first.IsString()) {
      throw Napi::Error::New(env, "Expected option key to be a string but got "
                       + option.ToString().Utf8Value());
    }

    auto second = option.Get((uint32_t) 1);
    if (!first.IsString()) {
      throw Napi::Error::New(env, "Expected option value to be a string but got "
                       + option.ToString().Utf8Value());
    }

    pair.first = first.As<Napi::String>().Utf8Value();
    pair.second = second.As<Napi::String>().Utf8Value();
    return pair;
  }

  std::pair<Napi::Array, std::vector<TensorInfo*>> make_tensors(
      Napi::Env &env, TfLiteInterpreter* interpreter, bool get_inputs) {
    // Functions to get data from TfLite.
    int32_t(*get_count)(const TfLiteInterpreter*);
    TfLiteTensor*(*get_tensor)(const TfLiteInterpreter*, int32_t);

    if (get_inputs) {
      get_count = &TfLiteInterpreterGetInputTensorCount;
      get_tensor = &TfLiteInterpreterGetInputTensor;
    } else {
      get_count = &TfLiteInterpreterGetOutputTensorCount;
      // Cast the function type because GetOutputTensor returns const tensors.
      get_tensor = (TfLiteTensor*(*)(const TfLiteInterpreter*, int32_t))
                   &TfLiteInterpreterGetOutputTensor;
    }

    int32_t tensor_count = get_count(interpreter);
    Napi::Array tensor_array = Napi::Array::New(env, tensor_count);
    std::vector<TensorInfo*> tensor_vector;
    for (int id = 0; id < tensor_count; id++) {
      const TfLiteTensor* tensor = get_tensor(interpreter, id);
      auto wrapped_tensor_info = TensorInfo::constructor.New({});
      auto tensor_info = TensorInfo::Unwrap(wrapped_tensor_info);
      tensor_info->setTensor(env, tensor, id);
      tensor_array[id] = wrapped_tensor_info;
      tensor_vector.push_back(tensor_info);
    }
    return std::pair<Napi::Array, std::vector<TensorInfo*>>(tensor_array,
                                                            tensor_vector);
  }

  /**
   * This function is passed to tflite as an error reporter. It appends
   * errors to the stringstream passed to it as error_stream.
   */
  static void report_error(void* error_stream, const char* format, va_list args) {
    std::stringstream *err = (std::stringstream*) error_stream;
    char err_message_buffer[MAX_ERROR_LEN];
    std::vsnprintf(err_message_buffer, MAX_ERROR_LEN, format, args);
    *err << err_message_buffer << std::endl;
  }

  /**
   * Get the error messages reported by 'report_error' and clear the error
   * stream.
   */
  std::string get_and_clear_error_message() {
    std::string error_message = error_stream.str();
    error_stream.str(std::string());
    return error_message;
  }

  /**
   * Throw an error if the TfLiteStatus is not okay. Includes the 'message' in
   * error and appends a description of the TfLite error along with any error
   * messages reported by TfLite.
   */
  void throw_if_tflite_error(Napi::Env &env, std::string message, TfLiteStatus status) {
    if (status != kTfLiteOk) {
      throw Napi::Error::New(env, message + ": " + decodeStatus(status) + ". "
                             + get_and_clear_error_message());
    }
  }

  Napi::Value Infer(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    for (TensorInfo* tensor : inputTensors) {
      tensor->copyToTflite(env);
    }

    throw_if_tflite_error(env, "Failed to invoke interpreter",
                          TfLiteInterpreterInvoke(interpreter));

    for (TensorInfo* tensor : outputTensors) {
      tensor->copyFromTflite(env);
    }

    return Napi::Boolean::New(env, true);
  }
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  Interpreter::Init(env, exports);
  TensorInfo::Init(env, exports);

  return exports;
}

NODE_API_MODULE(tfjs_tflite_node, Init)
}
