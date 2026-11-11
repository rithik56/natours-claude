import Link from 'next/link';

type ShellNavLinksProps = { isLoggedIn: boolean };

// The one list of shell links. The header and the footer both render it, so their nav cannot drift apart (D-01).
export function ShellNavLinks({ isLoggedIn }: ShellNavLinksProps) {
  return (
    <>
      <li>
        <Link href="/">Tours</Link>
      </li>
      <li>
        <Link href="/my-tours">My tours</Link>
      </li>
      {isLoggedIn ? (
        <li>
          <Link href="/me">Account</Link>
        </li>
      ) : (
        <>
          <li>
            <Link href="/login">Log in</Link>
          </li>
          <li>
            <Link href="/signup">Sign up</Link>
          </li>
        </>
      )}
    </>
  );
}
