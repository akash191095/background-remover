<script lang="ts">
	import { writable } from 'svelte/store';
	import { fade } from 'svelte/transition';

	interface SuccessResponse {
		success: true;
		message: string;
		result: string; // Blob will be serialized to a Base64 string
	}

	interface ErrorResponse {
		success?: false;
		message?: string;
		error?: string;
	}

	type ApiResponse = SuccessResponse | ErrorResponse;

	const processedImage = writable<Blob | null>(null);
	const responseMessage = writable<string>('');
	const selectedImage = writable<string | null>(null);
	const isProcessed = writable<boolean>(false);
	const isLoading = writable<boolean>(false);

	function handleDownload() {
		if ($processedImage) {
			const url = URL.createObjectURL($processedImage);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'processed-image.png'; // or whatever filename you want
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const reader = new FileReader();
			reader.onload = (e) => {
				selectedImage.set(e.target?.result as string);
				isProcessed.set(false);
				isLoading.set(false);
				processedImage.set(null);
				responseMessage.set('');
			};
			reader.readAsDataURL(input.files[0]);
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		try {
			isLoading.set(true);
			const response = await fetch('/api/remove-background', {
				method: 'POST',
				body: formData
			});

			const result: ApiResponse = await response.json();

			if ('success' in result && result.success) {
				// Convert the Base64 string back to a Blob
				const byteCharacters = atob(result.result.split(',')[1]);
				const byteNumbers = new Array(byteCharacters.length);
				for (let i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i);
				}
				const byteArray = new Uint8Array(byteNumbers);
				const blob = new Blob([byteArray], { type: 'image/png' });

				processedImage.set(blob);
				responseMessage.set(result.message);
				isProcessed.set(true);
				isLoading.set(false);
			} else {
				processedImage.set(null);
				responseMessage.set(result.message || result.error || 'An error occurred');
			}

			console.log('Response processed:', result.message);
		} catch (error) {
			console.error('Error:', error);
			responseMessage.set('An error occurred while processing the image.');
			processedImage.set(null);
		}
	}

	function getImageUrl(blob: Blob | null): string {
		return blob ? URL.createObjectURL(blob) : '';
	}

	let imageUrl = '';

	$: {
		if ($processedImage) {
			imageUrl = getImageUrl($processedImage);
		} else {
			if (imageUrl) {
				URL.revokeObjectURL(imageUrl);
				imageUrl = '';
			}
		}
	}

	import { onDestroy } from 'svelte';

	onDestroy(() => {
		if (imageUrl) {
			URL.revokeObjectURL(imageUrl);
		}
	});
</script>

<div class="min-h-screen bg-gray-900 px-4 py-12 text-gray-100 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-3xl">
		<h1 class="mb-8 text-center text-3xl font-bold">Background Remover</h1>

		<form on:submit={handleSubmit} class="mb-8">
			<div
				class="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
			>
				<label
					for="image-upload"
					class="relative cursor-pointer rounded-md bg-gray-800 font-medium text-indigo-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-300"
				>
					<span class="block px-4 py-2">Choose Image</span>
					<input
						id="image-upload"
						name="image"
						type="file"
						accept="image/*"
						required
						class="sr-only"
						on:change={handleFileSelect}
						on:click={(event: MouseEvent) => {
							(event.target as HTMLInputElement).value = '';
						}}
					/>
				</label>
				<button
					type="submit"
					class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={$isLoading || !$selectedImage}
				>
					{#if $isLoading}
						<span class="spinner mr-2"></span>
						Processing...
					{:else}
						Remove Background
					{/if}
				</button>
				<button
					type="button"
					class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!$processedImage}
					on:click={handleDownload}
				>
					Download
				</button>
			</div>
		</form>

		<div class="mb-8">
			<h2 class="mb-4 text-center text-xl font-semibold">
				{!$isProcessed && $selectedImage ? 'Selected Image' : ''}
				{$isProcessed && $selectedImage ? 'Processed Image' : ''}
				{!$selectedImage ? 'Select an Image to get started!' : ''}
			</h2>
			<div class="relative flex justify-center">
				{#if $selectedImage && !$isProcessed}
					<img
						src={$selectedImage}
						alt="Selected"
						class="absolute h-auto max-w-full rounded-lg shadow-lg"
						transition:fade={{ duration: 300 }}
					/>
				{:else if imageUrl && $isProcessed}
					<img
						src={imageUrl}
						alt="Processed"
						class="absolute h-auto max-w-full rounded-lg shadow-lg"
						transition:fade={{ duration: 300 }}
					/>
				{/if}
				{#if $selectedImage && !$isProcessed}
					<img
						src={$selectedImage}
						alt="Selected"
						class="invisible h-auto max-w-full rounded-lg shadow-lg"
						transition:fade={{ duration: 300 }}
					/>
				{:else if imageUrl && $isProcessed}
					<img
						src={imageUrl}
						alt="Processed"
						class="invisible h-auto max-w-full rounded-lg shadow-lg"
						transition:fade={{ duration: 300 }}
					/>
				{/if}
			</div>
		</div>

		{#if $responseMessage}
			<p class="mb-6 rounded-md bg-gray-800 p-4 text-center" transition:fade={{ duration: 300 }}>
				{$responseMessage}
			</p>
		{/if}
	</div>
</div>

<style>
	.spinner {
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top: 4px solid #ffffff;
		width: 40px;
		height: 40px;
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
