export namespace bindings {
	
	export class AuthResult {
	    token: string;
	    user: domain.UserResponse;
	
	    static createFrom(source: any = {}) {
	        return new AuthResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.token = source["token"];
	        this.user = this.convertValues(source["user"], domain.UserResponse);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ServerStatus {
	    active: boolean;
	    public_url: string;
	    local_ip: string;
	
	    static createFrom(source: any = {}) {
	        return new ServerStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.active = source["active"];
	        this.public_url = source["public_url"];
	        this.local_ip = source["local_ip"];
	    }
	}

}

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
	export class UserResponse {
	    id: string;
	    username: string;
	
	    static createFrom(source: any = {}) {
	        return new UserResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.username = source["username"];
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

