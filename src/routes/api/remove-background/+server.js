import { removeBackground } from '@imgly/background-removal-node';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const data = await request.formData();

		const file = data.get('image');

		if (!file || !(file instanceof File)) {
			return json({ error: 'No valid file uploaded' }, { status: 400 });
		}

		const outputBlob = await removeBackground(file);
		const arrayBuffer = await outputBlob.arrayBuffer();
		const base64 = btoa(
			new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
		);

		return json({
			success: true,
			message: 'Background removed successfully',
			result: `data:${outputBlob.type};base64,${base64}`
		});
	} catch (error) {
		console.error('Error removing background:', error);
		return json({ message: 'Failed to remove background' }, { status: 500 });
	}
}
