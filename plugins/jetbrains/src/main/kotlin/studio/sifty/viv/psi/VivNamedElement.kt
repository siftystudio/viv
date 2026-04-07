package studio.sifty.viv.psi

import com.intellij.psi.PsiNameIdentifierOwner

/** A Viv PSI element that has a name (implements [PsiNameIdentifierOwner] for rename support). */
interface VivNamedElement : VivElement, PsiNameIdentifierOwner
