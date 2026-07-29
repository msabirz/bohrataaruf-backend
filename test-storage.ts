import { getViewUrl } from './src/lib/storage';

async function test() {
  try {
    console.log("Testing null:");
    console.log(await getViewUrl(null));
    
    console.log("Testing undefined:");
    console.log(await getViewUrl(undefined));
    
    console.log("Testing mock key:");
    console.log(await getViewUrl("profile-photos/mock.jpg"));
  } catch (err) {
    console.error("Crash:", err);
  }
}
test();
