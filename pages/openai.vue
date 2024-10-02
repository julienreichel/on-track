<template>
  <div class="container">
    <h1>ChatGPT Interface</h1>

    <!-- Prompt Input -->
    <label for="prompt">Prompt</label>
    <textarea id="prompt" v-model="prompt" rows="6" class="input"/>

    <!-- Submit Button and Progress Icon -->
    <div class="controls">
      <button  :disabled="loading" @click="sendRequest">Send Request</button>
      <div v-if="loading" class="spinner"/>
    </div>

    <!-- Response Output -->
    <label for="response">Response</label>
    <textarea
      id="response"
      v-model="response"

      rows="8"
      class="output"

      readonly
    />
  </div>
</template>

<script setup lang="ts">
const prompt = ref('');
const response = ref('');
const loading = ref(false);

const openAIQuery = useOpenAI();

const sendRequest = async () => {
  loading.value = true;
  response.value = ''; // Clear previous response

  // Prepare the request payload
  const input = {
    prompt: prompt.value,
    token: 1000
  };
  response.value =  await openAIQuery(input);
  loading.value = false;
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

label {
  font-weight: bold;
  margin-top: 10px;
  display: block;
}

.input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.output {
  width: 100%;
  padding: 10px;
  margin-top: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f7f7f7;
}

.controls {
  display: flex;
  align-items: center;
}

button {
  padding: 10px 20px;
  width: 100%;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.spinner {
  margin-left: 10px;
  width: 24px;
  height: 24px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
