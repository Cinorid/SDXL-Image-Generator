import { Ai } from './vendor/@cloudflare/ai.js';

export default {
  async fetch(request, env) {
    if(request.method == "GET")
    {
      return new Response(`<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>SDXL Image Generator</title>
  <style>
    .grow-wrap {
      /* easy way to plop the elements on top of each other and have them both sized based on the tallest one's height */
      display: grid;
    }
    .grow-wrap::after {
      /* Note the weird space! Needed to preventy jumpy behavior */
      content: attr(data-replicated-value) \" \";

      /* This is how textarea text behaves */
      white-space: pre-wrap;

      /* Hidden from view, clicks, and screen readers */
      visibility: hidden;
    }
    .grow-wrap > textarea {
      /* You could leave this, but after a user resizes, then it ruins the auto sizing */
      resize: none;

      /* Firefox shows scrollbar on growth, you can hide like this. */
      overflow: hidden;
    }
    .grow-wrap > textarea,
    .grow-wrap::after {
      /* Identical styling required!! */
      border: 1px solid black;
      padding: 0.5rem;
      font: inherit;

      /* Place on top of each other */
      grid-area: 1 / 1 / 2 / 2;
    }

    body {
      margin: 2rem;
      font: 1rem/1.4 system-ui, sans-serif;
    }

    label {
      display: block;
    }

    input[type=submit] {
      background-color: #335ccb;
      border: none;
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      margin: 4px 2px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <form action=\"\" method=\"post\" enctype=\"multipart/form-data\">
    <label for=\"password\">Password:</label>
    <input type=\"password\" id=\"password\" name=\"password\"><br>
    <label for=\"prompt\">Prompt:</label>
    <div class=\"grow-wrap\">
      <textarea name=\"prompt\" id=\"prompt\" onInput=\"this.parentNode.dataset.replicatedValue = this.value\"></textarea>
    </div>
    <br>
    <label for=\"image\">Image:</label>
    <input type=\"file\" id=\"image\" name=\"image\"><br><br>
    <input type=\"submit\" value=\"Generate\">
  </form>
</body>
</html>`, {
            headers: {
              'content-type': 'text/html; charset=utf-8'
            }
          });
    }
    const ai = new Ai(env.AI);
    const url = new URL(request.url);
		const params = url.searchParams;
    
    let ACCESS_PASSWORD = `${env.ACCESS_PASSWORD}`;
    if(ACCESS_PASSWORD == null)
    {
      ACCESS_PASSWORD = "";
    }

    const formData = await request.formData();
    const password = formData.get('password');
    const prompt = formData.get('prompt');
    const file = formData.get('image');
    
    if(prompt == null || prompt == "")
    {
      return new Response("What are you doing here :-| ???");
    }
    
    if(password != ACCESS_PASSWORD)
    {
      return new Response("Wrong password :-/ ???");
    }

    let chunks = null;
    if (file != null && file != "")
    {
      const reader = await file.stream().getReader();
      chunks = [];
      let result = await reader.read();

      while (!result.done) 
      {
        chunks.push(result.value);
        result = await reader.read();
      }
    }

    let response = new Uint8Array();
    let model = ""

		try
    {
      if(chunks == null)
      {
        const inputs = { prompt: prompt };
        model = '@cf/stabilityai/stable-diffusion-xl-base-1.0';
        response = await ai.run(model, inputs);
      }
      else
      {
        const inputImage = new Uint8Array(chunks.reduce((acc, chunk) => acc.concat(Array.from(chunk)), []));

        const inputs = {
          prompt: prompt,
          image: [...inputImage],
        };
        model = '@cf/runwayml/stable-diffusion-v1-5-img2img';
        response = await ai.run(model, inputs);
      }
		}
    catch (e)
    {
			if (e instanceof Error)
      {
				return new Response(e.name + '\n' + e.message + '\n' + e.stack, { status: 500 });
			}
		}

    return new Response(response, {
      headers: {
        'content-type': 'image/png',
        'model': model
      }
    });
  }
};
