export namespace domain {
	
	export class CategoryResponse {
	    id: string;
	    slug: string;
	    name: string;
	    emoji: string;
	
	    static createFrom(source: any = {}) {
	        return new CategoryResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.slug = source["slug"];
	        this.name = source["name"];
	        this.emoji = source["emoji"];
	    }
	}
	export class DayVotesEntry {
	    question_id: string;
	    text: string;
	    votes_preto: number;
	    votes_branco: number;
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new DayVotesEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.question_id = source["question_id"];
	        this.text = source["text"];
	        this.votes_preto = source["votes_preto"];
	        this.votes_branco = source["votes_branco"];
	        this.total = source["total"];
	    }
	}
	export class QuestionResponse {
	    id: string;
	    category_id: string;
	    text: string;
	
	    static createFrom(source: any = {}) {
	        return new QuestionResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.category_id = source["category_id"];
	        this.text = source["text"];
	    }
	}
	export class VoteResultResponse {
	    question_id: string;
	    pct_preto: number;
	    pct_branco: number;
	    total: number;
	
	    static createFrom(source: any = {}) {
	        return new VoteResultResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.question_id = source["question_id"];
	        this.pct_preto = source["pct_preto"];
	        this.pct_branco = source["pct_branco"];
	        this.total = source["total"];
	    }
	}

}

